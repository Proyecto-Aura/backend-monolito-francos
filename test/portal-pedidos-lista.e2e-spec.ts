import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';

const ADMIN_CREDENTIALS = { identificador: 'admin', password: 'admin123' };
const PASSWORD = 'VentasE2e123';

type TestUser = {
  identificador: string;
  email: string;
  documento: string;
  rol: 'cliente' | 'ventas';
  cliente: 'activo' | null;
};

const TEST_USERS = {
  cliente: {
    identificador: 'e2e-cliente-mispedidos',
    email: 'e2e-cliente-mispedidos@francos.test',
    documento: '99999961',
    rol: 'cliente',
    cliente: 'activo',
  },
  otro: {
    identificador: 'e2e-cliente-mispedidos-ot',
    email: 'e2e-cliente-mispedidos-ot@francos.test',
    documento: '99999962',
    rol: 'cliente',
    cliente: 'activo',
  },
  ventas: {
    identificador: 'e2e-ventas-mispedidos',
    email: 'e2e-ventas-mispedidos@francos.test',
    documento: '99999963',
    rol: 'ventas',
    cliente: null,
  },
} satisfies Record<string, TestUser>;

type Clave = keyof typeof TEST_USERS;

const PREFIJO_PEDIDO = 'PED-E2E-MP';

interface PedidoListado {
  id: number;
  codigo: string;
  estado: string;
  metodo_pago: string | null;
  reembolso: { id: number; estado: string } | null;
}

interface ListadoBody {
  data: PedidoListado[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

describe('Mis pedidos del portal (e2e, OFT0-557)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  const tokens: Partial<Record<Clave | 'admin', string>> = {};
  const pedidos = { entregado: 0, confirmado: 0, conReembolso: 0, ajeno: 0 };
  let reembolsoId: number;

  const login = async (credentials: {
    identificador: string;
    password: string;
  }) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(credentials);
    expect([200, 201]).toContain(response.status);
    return (response.body as unknown as { access_token: string }).access_token;
  };

  const get = (
    token: string | undefined,
    query: Record<string, unknown> = {},
  ) => {
    const req = request(app.getHttpServer()).get('/api/v1/portal/pedidos');
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req.query(query);
  };

  const deleteTestData = async () => {
    const pedidosE2e = await prisma.pedido.findMany({
      where: { codigo: { startsWith: PREFIJO_PEDIDO } },
      select: { id: true },
    });
    const pedidoIds = pedidosE2e.map(({ id }) => id);
    await prisma.reembolso.deleteMany({
      where: { pago: { pedido_id: { in: pedidoIds } } },
    });
    await prisma.pago.deleteMany({ where: { pedido_id: { in: pedidoIds } } });
    await prisma.pedido.deleteMany({ where: { id: { in: pedidoIds } } });

    for (const testUser of Object.values(TEST_USERS)) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ username: testUser.identificador }, { email: testUser.email }],
        },
        select: { id: true },
      });
      if (user) {
        await prisma.$transaction([
          prisma.refreshToken.deleteMany({ where: { user_id: user.id } }),
          prisma.usuarioRol.deleteMany({ where: { user_id: user.id } }),
          prisma.user.delete({ where: { id: user.id } }),
        ]);
      }
      await prisma.cliente.deleteMany({
        where: { persona: { numero_documento: testUser.documento } },
      });
      await prisma.persona.deleteMany({
        where: { numero_documento: testUser.documento },
      });
    }
  };

  const createTestUser = async (testUser: TestUser) => {
    const rol = await prisma.rol.findUniqueOrThrow({
      where: { nombre: testUser.rol },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Rosa Elena',
        apellido_paterno: testUser.rol,
        apellido_materno: 'Mis Pedidos E2E',
        tipo_documento: 'dni',
        numero_documento: testUser.documento,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: testUser.email,
        username: testUser.identificador,
        contrasena: await hashPassword(PASSWORD),
        estado: true,
        email_verificado: true,
      },
    });
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: rol.id, estado: true },
    });
    const cliente = testUser.cliente
      ? await prisma.cliente.create({
          data: {
            persona_id: persona.id,
            tipo_cliente: 'persona_natural',
            categoria_cliente: 'minorista',
            estado: true,
          },
        })
      : null;
    return { userId: user.id, clienteId: cliente?.id ?? null };
  };

  const crearPedido = async (
    n: number,
    clienteId: string,
    estado: 'confirmado' | 'entregado',
    pago: { metodo: 'culqi' | 'efectivo'; monto: number } | null,
  ) => {
    const pedido = await prisma.pedido.create({
      data: {
        codigo: `${PREFIJO_PEDIDO}${n}`,
        cliente_id: clienteId,
        origen: 'portal',
        estado,
        tipo_entrega: 'recojo_tienda',
        total: pago?.monto ?? 50,
        ...(pago
          ? {
              pago: {
                create: {
                  metodo_pago: pago.metodo,
                  monto: pago.monto,
                  numero_operacion:
                    pago.metodo === 'culqi' ? `chr_e2e_mp_${n}` : null,
                  fecha_pago: new Date(),
                },
              },
            }
          : {}),
      },
    });
    const pago_ = await prisma.pago.findFirst({
      where: { pedido_id: pedido.id },
    });
    return { pedidoId: pedido.id, pagoId: pago_?.id ?? null };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await deleteTestData();

    const adminUser = await prisma.user.findUniqueOrThrow({
      where: { username: ADMIN_CREDENTIALS.identificador },
      select: { id: true },
    });
    adminUserId = adminUser.id;
    existingAdminRefreshTokenIds = (
      await prisma.refreshToken.findMany({
        where: { user_id: adminUserId },
        select: { id: true },
      })
    ).map(({ id }) => id);

    const clienteIds: Partial<Record<Clave, string | null>> = {};
    for (const [clave, testUser] of Object.entries(TEST_USERS)) {
      const creado = await createTestUser(testUser);
      clienteIds[clave as Clave] = creado.clienteId;
      tokens[clave as Clave] = await login({
        identificador: testUser.identificador,
        password: PASSWORD,
      });
    }
    tokens.admin = await login(ADMIN_CREDENTIALS);

    const cliente = clienteIds.cliente!;
    pedidos.entregado = (
      await crearPedido(1, cliente, 'entregado', {
        metodo: 'culqi',
        monto: 170,
      })
    ).pedidoId;
    pedidos.confirmado = (
      await crearPedido(2, cliente, 'confirmado', {
        metodo: 'efectivo',
        monto: 89.5,
      })
    ).pedidoId;
    const conReembolso = await crearPedido(3, cliente, 'entregado', {
      metodo: 'culqi',
      monto: 55,
    });
    pedidos.conReembolso = conReembolso.pedidoId;
    const reembolso = await prisma.reembolso.create({
      data: {
        codigo: 'SOL-E2E-MP-001',
        pago_id: conReembolso.pagoId!,
        monto: 55,
        motivo_cliente: 'Producto en mal estado: llegó roto.',
        evidencia_key: null,
        estado: 'pendiente',
      },
    });
    reembolsoId = reembolso.id;
    pedidos.ajeno = (
      await crearPedido(4, clienteIds.otro!, 'entregado', {
        metodo: 'culqi',
        monto: 33,
      })
    ).pedidoId;
  });

  afterAll(async () => {
    await deleteTestData();
    await prisma.refreshToken.deleteMany({
      where: {
        user_id: adminUserId,
        id: { notIn: existingAdminRefreshTokenIds },
      },
    });
    await app.close();
  });

  describe('autorización', () => {
    it('sin token devuelve 401', async () => {
      await get(undefined).expect(401);
    });

    it('con rol ventas devuelve 403', async () => {
      await get(tokens.ventas).expect(403);
    });
  });

  describe('listar (200)', () => {
    it('lista solo los pedidos propios, más recientes primero', async () => {
      const response = await get(tokens.cliente).expect(200);
      const body = response.body as ListadoBody;
      const ids = body.data.map((p) => p.id);

      expect(body.meta.total).toBe(3);
      expect(ids).toEqual([
        pedidos.conReembolso,
        pedidos.confirmado,
        pedidos.entregado,
      ]);
      expect(ids).not.toContain(pedidos.ajeno);
    });

    it('filtra por estado', async () => {
      const response = await get(tokens.cliente, {
        estado: 'confirmado',
      }).expect(200);
      const body = response.body as ListadoBody;

      expect(body.data.map((p) => p.id)).toEqual([pedidos.confirmado]);
    });

    it('un estado que no existe devuelve 400', async () => {
      await get(tokens.cliente, { estado: 'enviado' }).expect(400);
    });

    it('expone el método de pago de cada pedido', async () => {
      const response = await get(tokens.cliente).expect(200);
      const body = response.body as ListadoBody;

      const confirmado = body.data.find((p) => p.id === pedidos.confirmado);
      expect(confirmado?.metodo_pago).toBe('efectivo');
    });

    it('el pedido con solicitud expone su reembolso; los demás, null', async () => {
      const response = await get(tokens.cliente).expect(200);
      const body = response.body as ListadoBody;

      const conReembolso = body.data.find((p) => p.id === pedidos.conReembolso);
      expect(conReembolso?.reembolso).toEqual({
        id: reembolsoId,
        estado: 'pendiente',
      });

      const entregado = body.data.find((p) => p.id === pedidos.entregado);
      expect(entregado?.reembolso).toBeNull();
    });
  });
});
