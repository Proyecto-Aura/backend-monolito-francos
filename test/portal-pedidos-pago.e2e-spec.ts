import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import {
  CobroParams,
  CobroResultado,
  PasarelaPagoService,
} from '../src/modules/sales/domain/services/pasarela-pago.service';

const ADMIN_CREDENTIALS = { identificador: 'admin', password: 'admin123' };
const PASSWORD = 'PagoE2e123';
const DIRECCION_PERFIL = 'Jr. Huallaga 320, Cercado de Lima';

const TEST_USERS = {
  cliente: {
    identificador: 'e2e-cliente-pago',
    email: 'e2e-cliente-pago@francos.test',
    documento: '99999961',
    rol: 'cliente',
    conCliente: true,
  },
  // Otro cliente: no debe ver los pedidos de `cliente` (HU-B-013).
  otro: {
    identificador: 'e2e-cliente-pago-ot',
    email: 'e2e-cliente-pago-ot@francos.test',
    documento: '99999964',
    rol: 'cliente',
    conCliente: true,
  },
  sinCliente: {
    identificador: 'e2e-cliente-pago-nc',
    email: 'e2e-cliente-pago-nc@francos.test',
    documento: '99999962',
    rol: 'cliente',
    conCliente: false,
  },
  ventas: {
    identificador: 'e2e-ventas-pago',
    email: 'e2e-ventas-pago@francos.test',
    documento: '99999963',
    rol: 'ventas',
    conCliente: false,
  },
} as const;

const CATEGORIA_NOMBRE = 'E2E Categoría Pago OFT0-533';
const PRESENTACION_DESCRIPCION = 'E2E Pago OFT0-533';
const PRODUCTO_NOMBRE = 'E2E Producto Pago OFT0-533';

const TOKEN_APROBADO = 'tkn_sim_ok_e2e';
const TOKEN_RECHAZADO = 'tkn_sim_ko_e2e';
const MENSAJE_RECHAZO = 'Tu tarjeta no tiene fondos suficientes.';

// Doble de la pasarela: el e2e no cobra de verdad ni depende de una llave.
class FakePasarelaPago implements PasarelaPagoService {
  private cargos = 0;

  cobrar(params: CobroParams): Promise<CobroResultado> {
    if (params.token === TOKEN_RECHAZADO) {
      return Promise.resolve({ aprobado: false, mensaje: MENSAJE_RECHAZO });
    }

    this.cargos += 1;
    return Promise.resolve({
      aprobado: true,
      numero_operacion: `chr_e2e_pago_${Date.now()}_${this.cargos}`,
      fecha: new Date(),
    });
  }
}

interface PedidoCreadoBody {
  id: number;
  codigo: string;
  estado: string;
  origen: string;
  pago: { metodo_pago: string; monto: number; numero_operacion: string } | null;
  total: number;
  tipo_entrega: string;
  direccion_entrega: string | null;
}

describe('Pago del pedido del portal (e2e, HU-B-008)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  const tokens: Partial<Record<keyof typeof TEST_USERS | 'admin', string>> = {};
  let presentacionMayoristaId: number;
  let presentacionSimpleId: number;

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

  const pagar = (payload: Record<string, unknown>, token?: string) => {
    const req = request(app.getHttpServer()).post('/api/v1/portal/pedidos');
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req.send(payload);
  };

  // 30 bolsas mayoristas (> umbral de 24) + 4 simples:
  // 30 x 4.20 + 4 x 9.90 = 126.00 + 39.60 = 165.60.
  const payload = (overrides: Record<string, unknown> = {}) => ({
    items: [
      { producto_presentacion_id: presentacionMayoristaId, cantidad: 30 },
      { producto_presentacion_id: presentacionSimpleId, cantidad: 4 },
    ],
    tipo_entrega: 'delivery',
    culqi_token: TOKEN_APROBADO,
    ...overrides,
  });

  const userIdDe = async (clave: keyof typeof TEST_USERS) =>
    (
      await prisma.user.findFirstOrThrow({
        where: { username: TEST_USERS[clave].identificador },
        select: { id: true },
      })
    ).id;

  const deleteTestData = async () => {
    const clientes = await prisma.cliente.findMany({
      where: {
        persona: {
          numero_documento: {
            in: Object.values(TEST_USERS).map(({ documento }) => documento),
          },
        },
      },
      select: { id: true },
    });
    const pedidos = await prisma.pedido.findMany({
      where: { cliente_id: { in: clientes.map(({ id }) => id) } },
      select: { id: true },
    });
    const pedidoIds = pedidos.map(({ id }) => id);

    // HU-B-010: si hay serie y emisora activas, el pago deja un comprobante.
    await prisma.comprobante.deleteMany({
      where: { pago: { pedido_id: { in: pedidoIds } } },
    });
    await prisma.pago.deleteMany({ where: { pedido_id: { in: pedidoIds } } });
    await prisma.detallePedido.deleteMany({
      where: { pedido_id: { in: pedidoIds } },
    });
    await prisma.pedido.deleteMany({ where: { id: { in: pedidoIds } } });

    for (const testUser of Object.values(TEST_USERS)) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ username: testUser.identificador }, { email: testUser.email }],
        },
        select: { id: true },
      });

      if (user) {
        await prisma.notificacionUser.deleteMany({
          where: { user_id: user.id },
        });
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

    // Las notificaciones de pago quedan sin destinatario al borrar los usuarios.
    await prisma.notificacion.deleteMany({
      where: {
        tipo: { in: ['pago_confirmado', 'pago_rechazado'] },
        notificacion_users: { none: {} },
      },
    });

    const productos = await prisma.producto.findMany({
      where: { nombre: PRODUCTO_NOMBRE },
      select: { id: true },
    });
    const productoIds = productos.map(({ id }) => id);
    await prisma.productoPresentacion.deleteMany({
      where: { producto_id: { in: productoIds } },
    });
    await prisma.producto.deleteMany({ where: { id: { in: productoIds } } });
    await prisma.presentacion.deleteMany({
      where: { descripcion: PRESENTACION_DESCRIPCION },
    });
    await prisma.categoria.deleteMany({ where: { nombre: CATEGORIA_NOMBRE } });
  };

  const createTestUser = async (
    testUser: (typeof TEST_USERS)[keyof typeof TEST_USERS],
  ) => {
    const rol = await prisma.rol.findUniqueOrThrow({
      where: { nombre: testUser.rol },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Rosa Elena',
        apellido_paterno: testUser.rol,
        apellido_materno: 'Pago E2E',
        tipo_documento: 'dni',
        numero_documento: testUser.documento,
        direccion: DIRECCION_PERFIL,
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

    if (testUser.conCliente) {
      await prisma.cliente.create({
        data: {
          persona_id: persona.id,
          tipo_cliente: 'persona_natural',
          categoria_cliente: 'minorista',
          estado: true,
        },
      });
    }
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PasarelaPagoService)
      .useValue(new FakePasarelaPago())
      .compile();

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

    const categoria = await prisma.categoria.create({
      data: { nombre: CATEGORIA_NOMBRE },
    });
    const presentaciones = await Promise.all(
      [7811, 7812].map((cantidad) =>
        prisma.presentacion.create({
          data: {
            cantidad,
            unidad_medida: 'gr',
            descripcion: PRESENTACION_DESCRIPCION,
          },
        }),
      ),
    );
    const producto = await prisma.producto.create({
      data: { categoria_id: categoria.id, nombre: PRODUCTO_NOMBRE },
    });
    const crearPresentacion = async (
      presentacionId: number,
      data: {
        precio_unitario: number;
        precio_mayorista?: number;
        umbral_mayorista?: number;
      },
    ) =>
      (
        await prisma.productoPresentacion.create({
          data: {
            sku: `FR-P${producto.id}-PR${presentacionId}`,
            producto_id: producto.id,
            presentacion_id: presentacionId,
            visible_portal_b: true,
            ...data,
          },
        })
      ).id;

    presentacionMayoristaId = await crearPresentacion(presentaciones[0].id, {
      precio_unitario: 5.5,
      precio_mayorista: 4.2,
      umbral_mayorista: 24,
    });
    presentacionSimpleId = await crearPresentacion(presentaciones[1].id, {
      precio_unitario: 9.9,
    });

    for (const [clave, testUser] of Object.entries(TEST_USERS)) {
      await createTestUser(testUser);
      tokens[clave as keyof typeof TEST_USERS] = await login({
        identificador: testUser.identificador,
        password: PASSWORD,
      });
    }
    tokens.admin = await login(ADMIN_CREDENTIALS);
  }, 30_000);

  afterAll(async () => {
    await deleteTestData();
    await prisma.refreshToken.deleteMany({
      where: {
        user_id: adminUserId,
        id: { notIn: existingAdminRefreshTokenIds },
      },
    });
    await app.close();
  }, 30_000);

  describe('autorización', () => {
    it('sin token devuelve 401', async () => {
      await pagar(payload()).expect(401);
    });

    it.each(['admin', 'ventas'] as const)(
      'con rol %s devuelve 403',
      async (rol) => {
        await pagar(payload(), tokens[rol]).expect(403);
      },
    );
  });

  describe('validación', () => {
    it('sin token de pago devuelve 400', async () => {
      const response = await pagar(
        payload({ culqi_token: undefined }),
        tokens.cliente,
      ).expect(400);

      expect(JSON.stringify(response.body)).toContain('token de pago');
    });

    it('sin productos devuelve 400', async () => {
      await pagar(payload({ items: [] }), tokens.cliente).expect(400);
    });

    it('rechaza campos que no son del pedido (el total no viene del body)', async () => {
      await pagar(payload({ total: 1 }), tokens.cliente).expect(400);
    });

    it('un usuario sin cliente devuelve 404', async () => {
      await pagar(payload(), tokens.sinCliente).expect(404);
    });

    it('una presentación inexistente devuelve 404', async () => {
      await pagar(
        payload({ items: [{ producto_presentacion_id: 999999, cantidad: 1 }] }),
        tokens.cliente,
      ).expect(404);
    });
  });

  describe('pago rechazado (RF-B26, RF-B27)', () => {
    it('devuelve 402, no guarda el pedido y avisa al cliente; luego se puede reintentar', async () => {
      const userId = await userIdDe('cliente');
      const pedidosAntes = await prisma.pedido.count();

      const rechazo = await pagar(
        payload({ culqi_token: TOKEN_RECHAZADO }),
        tokens.cliente,
      ).expect(402);

      expect(JSON.stringify(rechazo.body)).toContain(MENSAJE_RECHAZO);
      expect(await prisma.pedido.count()).toBe(pedidosAntes);

      const aviso = await prisma.notificacion.findFirstOrThrow({
        where: {
          tipo: 'pago_rechazado',
          notificacion_users: { some: { user_id: userId } },
        },
      });
      expect(aviso.mensaje).toContain('S/ 165.60');

      // Reintento con otro token: queda un solo pedido, no uno por intento.
      const reintento = await pagar(payload(), tokens.cliente).expect(201);

      expect((reintento.body as PedidoCreadoBody).estado).toBe('confirmado');
      expect(await prisma.pedido.count()).toBe(pedidosAntes + 1);
    });
  });

  describe('pago confirmado (RF-B24, RF-B28)', () => {
    it('crea el pedido pagado con el total del servidor y avisa al cliente', async () => {
      const userId = await userIdDe('cliente');
      const response = await pagar(
        payload({ direccion_entrega: 'Av. Los Olivos 123' }),
        tokens.cliente,
      ).expect(201);
      const pedido = response.body as PedidoCreadoBody;

      expect(pedido.codigo).toMatch(/^PED-\d{6}$/);
      expect(pedido.origen).toBe('portal');
      expect(pedido.pago?.metodo_pago).toBe('culqi');
      expect(pedido.tipo_entrega).toBe('delivery');
      expect(pedido.direccion_entrega).toBe('Av. Los Olivos 123');
      expect(Number(pedido.total)).toBe(165.6);

      const guardado = await prisma.pedido.findUniqueOrThrow({
        where: { id: pedido.id },
        include: { pago: true, detalles: true },
      });
      expect(guardado.pago?.metodo_pago).toBe('culqi');
      expect(Number(guardado.pago?.monto)).toBe(165.6);
      expect(guardado.pago?.numero_operacion).toMatch(/^chr_e2e_pago_/);
      expect(guardado.detalles).toHaveLength(2);

      const aviso = await prisma.notificacion.findFirstOrThrow({
        where: {
          tipo: 'pago_confirmado',
          referencia_id: String(pedido.id),
          notificacion_users: { some: { user_id: userId } },
        },
      });
      expect(aviso.referencia_tipo).toBe('pedido');
    });

    it('en recojo en tienda no guarda dirección de entrega', async () => {
      const response = await pagar(
        payload({ tipo_entrega: 'recojo_tienda' }),
        tokens.cliente,
      ).expect(201);

      expect((response.body as PedidoCreadoBody).direccion_entrega).toBeNull();
    });
  });

  describe('consulta del pedido (HU-B-013, RF-B37)', () => {
    const consultar = (id: number | string, token?: string) => {
      const req = request(app.getHttpServer()).get(
        `/api/v1/portal/pedidos/${id}`,
      );
      if (token) {
        req.set('Authorization', `Bearer ${token}`);
      }
      return req;
    };

    let pedidoId: number;

    beforeAll(async () => {
      const response = await pagar(payload(), tokens.cliente).expect(201);
      pedidoId = (response.body as PedidoCreadoBody).id;
    });

    it('sin token devuelve 401', async () => {
      await consultar(pedidoId).expect(401);
    });

    it.each(['admin', 'ventas'] as const)(
      'con rol %s devuelve 403',
      async (rol) => {
        await consultar(pedidoId, tokens[rol]).expect(403);
      },
    );

    it('el cliente ve su pedido como confirmado una vez pagado', async () => {
      const response = await consultar(pedidoId, tokens.cliente).expect(200);
      const pedido = response.body as PedidoCreadoBody;

      expect(pedido.id).toBe(pedidoId);
      expect(pedido.estado).toBe('confirmado');
      expect(pedido.pago?.metodo_pago).toBe('culqi');
      expect(Number(pedido.total)).toBe(165.6);
    });

    it('otro cliente no lo ve: responde 404 como si no existiera', async () => {
      await consultar(pedidoId, tokens.otro).expect(404);
    });

    it('un pedido que no existe devuelve 404', async () => {
      await consultar(999999, tokens.cliente).expect(404);
    });

    it('un usuario sin cliente devuelve 404', async () => {
      await consultar(pedidoId, tokens.sinCliente).expect(404);
    });

    it('un id que no es número devuelve 400', async () => {
      await consultar('abc', tokens.cliente).expect(400);
    });
  });
});
