import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { S3Service } from '../src/infrastructure/storage/s3.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { FakeS3Service } from './fake-s3.service';

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
    identificador: 'e2e-cliente-notif',
    email: 'e2e-cliente-notif@francos.test',
    documento: '99999971',
    rol: 'cliente',
    cliente: 'activo',
  },
  otro: {
    identificador: 'e2e-cliente-notif-ot',
    email: 'e2e-cliente-notif-ot@francos.test',
    documento: '99999972',
    rol: 'cliente',
    cliente: 'activo',
  },
  ventas: {
    identificador: 'e2e-ventas-notif',
    email: 'e2e-ventas-notif@francos.test',
    documento: '99999973',
    rol: 'ventas',
    cliente: null,
  },
} satisfies Record<string, TestUser>;

type Clave = keyof typeof TEST_USERS;

const PREFIJO_PEDIDO = 'PED-E2E-NOT';
const MOTIVO = 'Producto en mal estado';
const DESCRIPCION = 'Llegó la bolsa rota y con humedad.';

interface NotificacionBody {
  id: number;
  tipo: string;
  titulo: string;
  referencia_id: string | null;
  referencia_tipo: string | null;
  leido: boolean;
  fecha_leido: string | null;
}
interface ListadoBody {
  data: NotificacionBody[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

describe('Notificaciones del portal (e2e, OFT0-557)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  const tokens: Partial<Record<Clave | 'admin', string>> = {};
  const userIds: Partial<Record<Clave, string>> = {};
  let pedidoId: number;
  let solicitudId: number;
  let notificacionAprobadaId: number;
  const notificacionesAjenas: number[] = [];

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

  const getNotificaciones = (
    token: string | undefined,
    query: Record<string, unknown> = {},
  ) => {
    const req = request(app.getHttpServer()).get(
      '/api/v1/portal/notificaciones',
    );
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req.query(query);
  };

  const marcarLeida = (id: number, token: string | undefined) => {
    const req = request(app.getHttpServer()).patch(
      `/api/v1/portal/notificaciones/${id}/leida`,
    );
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };

  const getPreferencias = (token: string | undefined) => {
    const req = request(app.getHttpServer()).get(
      '/api/v1/portal/notificaciones/preferencias',
    );
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };

  const patchPreferencias = (token: string | undefined, body: object) => {
    const req = request(app.getHttpServer()).patch(
      '/api/v1/portal/notificaciones/preferencias',
    );
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req.send(body);
  };

  const deleteTestData = async () => {
    const pedidosE2e = await prisma.pedido.findMany({
      where: { codigo: { startsWith: PREFIJO_PEDIDO } },
      select: { id: true },
    });
    const pedidoIds = pedidosE2e.map(({ id }) => id);
    const reembolsos = await prisma.reembolso.findMany({
      where: { pago: { pedido_id: { in: pedidoIds } } },
      select: { id: true },
    });
    const reembolsoIds = reembolsos.map(({ id }) => id);
    const notificaciones = await prisma.notificacion.findMany({
      where: {
        OR: [
          {
            referencia_tipo: 'reembolso',
            referencia_id: { in: reembolsoIds.map(String) },
          },
          { titulo: { startsWith: 'E2E OFT0-557' } },
        ],
      },
      select: { id: true },
    });
    const notificacionIds = notificaciones.map(({ id }) => id);
    await prisma.notificacionUser.deleteMany({
      where: { notificacion_id: { in: notificacionIds } },
    });
    await prisma.notificacion.deleteMany({
      where: { id: { in: notificacionIds } },
    });
    await prisma.reembolso.deleteMany({ where: { id: { in: reembolsoIds } } });
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
          prisma.notificacionUser.deleteMany({ where: { user_id: user.id } }),
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
        apellido_materno: 'Notificaciones E2E',
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Service)
      .useValue(new FakeS3Service())
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

    const clienteIds: Partial<Record<Clave, string | null>> = {};
    for (const [clave, testUser] of Object.entries(TEST_USERS)) {
      const creado = await createTestUser(testUser);
      userIds[clave as Clave] = creado.userId;
      clienteIds[clave as Clave] = creado.clienteId;
      tokens[clave as Clave] = await login({
        identificador: testUser.identificador,
        password: PASSWORD,
      });
    }
    tokens.admin = await login(ADMIN_CREDENTIALS);

    // Pedido pagado del cliente, para pedir y aprobar un reembolso real.
    const pedido = await prisma.pedido.create({
      data: {
        codigo: `${PREFIJO_PEDIDO}1`,
        cliente_id: clienteIds.cliente!,
        origen: 'portal',
        estado: 'entregado',
        tipo_entrega: 'recojo_tienda',
        total: 120,
        pago: {
          create: {
            metodo_pago: 'culqi',
            monto: 120,
            numero_operacion: 'chr_e2e_notif_1',
            fecha_pago: new Date(),
          },
        },
      },
    });
    pedidoId = pedido.id;

    const solicitud = await request(app.getHttpServer())
      .post('/api/v1/portal/reembolsos')
      .set('Authorization', `Bearer ${tokens.cliente}`)
      .field('pedido_id', String(pedidoId))
      .field('motivo', MOTIVO)
      .field('descripcion', DESCRIPCION)
      .attach(
        'evidencia',
        Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF'),
        { filename: 'acta.pdf', contentType: 'application/pdf' },
      )
      .expect(201);
    solicitudId = (solicitud.body as { id: number }).id;

    await request(app.getHttpServer())
      .patch(`/api/v1/reembolsos/${solicitudId}/aprobar`)
      .set('Authorization', `Bearer ${tokens.ventas}`)
      .expect(200);

    const notificacionAprobada = await prisma.notificacion.findFirstOrThrow({
      where: {
        referencia_tipo: 'reembolso',
        referencia_id: String(solicitudId),
      },
    });
    notificacionAprobadaId = notificacionAprobada.id;

    // Dos notificaciones directas para el otro cliente (aislamiento).
    for (let i = 1; i <= 2; i += 1) {
      const notificacion = await prisma.notificacion.create({
        data: {
          tipo: 'promocion',
          titulo: `E2E OFT0-557 ajena ${i}`,
          mensaje: 'No debería verla el cliente de prueba',
          notificacion_users: { create: { user_id: userIds.otro! } },
        },
      });
      notificacionesAjenas.push(notificacion.id);
    }
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
    it('GET sin token devuelve 401', async () => {
      await getNotificaciones(undefined).expect(401);
    });

    it('PATCH sin token devuelve 401', async () => {
      await marcarLeida(notificacionAprobadaId, undefined).expect(401);
    });

    it('con rol ventas devuelve 403', async () => {
      await getNotificaciones(tokens.ventas).expect(403);
      await marcarLeida(notificacionAprobadaId, tokens.ventas).expect(403);
    });
  });

  describe('listar (200)', () => {
    it('lista solo las propias, sin leer, más recientes primero', async () => {
      const response = await getNotificaciones(tokens.cliente).expect(200);
      const body = response.body as ListadoBody;

      expect(body.meta.total).toBe(1);
      expect(body.data[0]).toMatchObject({
        id: notificacionAprobadaId,
        tipo: 'reembolso_aprobado',
        referencia_tipo: 'reembolso',
        referencia_id: String(solicitudId),
        leido: false,
        fecha_leido: null,
      });
    });

    it('no trae las del otro cliente', async () => {
      const response = await getNotificaciones(tokens.cliente).expect(200);
      const ids = (response.body as ListadoBody).data.map((n) => n.id);

      expect(ids).not.toEqual(expect.arrayContaining(notificacionesAjenas));
    });

    it('el otro cliente ve las suyas, aisladas de las del primero', async () => {
      const response = await getNotificaciones(tokens.otro).expect(200);
      const body = response.body as ListadoBody;

      expect(body.meta.total).toBe(2);
      expect(body.data.map((n) => n.id).sort()).toEqual(
        [...notificacionesAjenas].sort(),
      );
    });

    it('filtra por leido=true: antes de marcar, vacío', async () => {
      const response = await getNotificaciones(tokens.cliente, {
        leido: true,
      }).expect(200);
      expect((response.body as ListadoBody).meta.total).toBe(0);
    });
  });

  describe('marcar como leída', () => {
    it('una notificación ajena devuelve 404', async () => {
      await marcarLeida(notificacionesAjenas[0], tokens.cliente).expect(404);
    });

    it('una notificación que no existe devuelve 404', async () => {
      await marcarLeida(999999999, tokens.cliente).expect(404);
    });

    it('marca la propia como leída y el siguiente GET lo refleja', async () => {
      await marcarLeida(notificacionAprobadaId, tokens.cliente).expect(200);

      const response = await getNotificaciones(tokens.cliente, {
        leido: true,
      }).expect(200);
      const body = response.body as ListadoBody;

      expect(body.meta.total).toBe(1);
      expect(body.data[0]).toMatchObject({
        id: notificacionAprobadaId,
        leido: true,
      });
      expect(body.data[0].fecha_leido).not.toBeNull();
    });

    it('repetir la misma devuelve 404 (ya estaba leída)', async () => {
      await marcarLeida(notificacionAprobadaId, tokens.cliente).expect(404);
    });
  });

  describe('preferencias (OFT0-577)', () => {
    it('sin token devuelve 401', async () => {
      await getPreferencias(undefined).expect(401);
      await patchPreferencias(undefined, { pedido_en_camino: false }).expect(
        401,
      );
    });

    it('con rol ventas devuelve 403', async () => {
      await getPreferencias(tokens.ventas).expect(403);
      await patchPreferencias(tokens.ventas, {
        pedido_en_camino: false,
      }).expect(403);
    });

    it('CA-1: un cliente nuevo la tiene activa', async () => {
      const response = await getPreferencias(tokens.cliente).expect(200);

      expect(response.body).toEqual({ pedido_en_camino: true });
    });

    it.each([
      ['vacío', {}],
      ['texto en vez de booleano', { pedido_en_camino: 'false' }],
      ['con un campo extra', { pedido_en_camino: false, user_id: 'otro' }],
    ])('un cuerpo inválido (%s) devuelve 400', async (_caso, body) => {
      await patchPreferencias(tokens.cliente, body).expect(400);
    });

    it('CA-2 y CA-5: desactiva la propia y no toca la del otro cliente', async () => {
      const response = await patchPreferencias(tokens.cliente, {
        pedido_en_camino: false,
      }).expect(200);

      expect(response.body).toEqual({ pedido_en_camino: false });
      const propia = await getPreferencias(tokens.cliente).expect(200);
      expect(propia.body).toEqual({ pedido_en_camino: false });
      const ajena = await getPreferencias(tokens.otro).expect(200);
      expect(ajena.body).toEqual({ pedido_en_camino: true });
    });

    it('CA-2: la vuelve a activar', async () => {
      await patchPreferencias(tokens.cliente, {
        pedido_en_camino: true,
      }).expect(200);

      const response = await getPreferencias(tokens.cliente).expect(200);
      expect(response.body).toEqual({ pedido_en_camino: true });
    });
  });
});
