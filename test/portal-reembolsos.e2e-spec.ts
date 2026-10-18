import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import {
  S3Service,
  StorageBucket,
} from '../src/infrastructure/storage/s3.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { FakeS3Service } from './fake-s3.service';

const ADMIN_CREDENTIALS = { identificador: 'admin', password: 'admin123' };
const PASSWORD = 'VentasE2e123';

type TestUser = {
  identificador: string;
  email: string;
  documento: string;
  rol: 'cliente' | 'ventas';
  // Registro Cliente vinculado: activo, inactivo o ninguno.
  cliente: 'activo' | 'inactivo' | null;
};

// `cliente` y `otro` solicitan reembolsos; `ventas` es staff: no entra al
// portal, pero aprueba la solicitud en el flujo completo.
const TEST_USERS = {
  cliente: {
    identificador: 'e2e-cliente-solreemb',
    email: 'e2e-cliente-solreemb@francos.test',
    documento: '99999941',
    rol: 'cliente',
    cliente: 'activo',
  },
  otro: {
    identificador: 'e2e-cliente-solreemb-ot',
    email: 'e2e-cliente-solreemb-ot@francos.test',
    documento: '99999942',
    rol: 'cliente',
    cliente: 'activo',
  },
  inactivo: {
    identificador: 'e2e-cliente-solreemb-in',
    email: 'e2e-cliente-solreemb-in@francos.test',
    documento: '99999943',
    rol: 'cliente',
    cliente: 'inactivo',
  },
  sinCliente: {
    identificador: 'e2e-cliente-solreemb-nc',
    email: 'e2e-cliente-solreemb-nc@francos.test',
    documento: '99999944',
    rol: 'cliente',
    cliente: null,
  },
  ventas: {
    identificador: 'e2e-ventas-solreemb',
    email: 'e2e-ventas-solreemb@francos.test',
    documento: '99999945',
    rol: 'ventas',
    cliente: null,
  },
} satisfies Record<string, TestUser>;

type Clave = keyof typeof TEST_USERS;

// Marca para reconocer (y borrar) los pedidos que crea este archivo. Las
// solicitudes se reconocen por el pago de esos pedidos: su código lo genera
// el servidor (SOL-000001).
const PREFIJO_PEDIDO = 'PED-E2E-SR';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const GIF = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x3b,
]);

const MOTIVO = 'Producto en mal estado';
const DESCRIPCION = 'Llegaron 4 packs de canchita con la bolsa rota.';

// Registra lo que se sube y se borra, para comprobar que no quedan huérfanos.
class FakeS3ConRegistro extends FakeS3Service {
  readonly subidas: string[] = [];

  upload(
    bucket: StorageBucket,
    key: string,
    body: Buffer,
    contentType?: string,
    cacheControl?: string,
  ): Promise<void> {
    this.subidas.push(key);
    return super.upload(bucket, key, body, contentType, cacheControl);
  }
}

interface SolicitudBody {
  id: number;
  codigo: string;
  pedido: { id: number; codigo: string };
  monto: number;
  estado: string;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
  motivo_cliente: string;
  motivo_rechazo: string | null;
  evidencia: { nombre: string; url: string } | null;
}

interface ListadoBody {
  data: SolicitudBody[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

describe('Solicitar reembolso desde el portal (e2e, HU-B-014)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const fakeS3 = new FakeS3ConRegistro();
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  const tokens: Partial<Record<Clave | 'admin', string>> = {};
  const userIds: Partial<Record<Clave, string>> = {};

  // Pedidos de prueba por escenario.
  const pedidos = {
    entregado: 0,
    confirmado: 0,
    enCamino: 0,
    sinPago: 0,
    cancelado: 0,
    ajeno: 0,
  };

  // Solicitudes creadas por la API durante la prueba.
  const solicitudes = { entregado: 0, confirmado: 0, ajena: 0 };

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

  const solicitar = (
    campos: Record<string, string>,
    token: string | undefined,
    archivo: {
      buffer: Buffer;
      filename: string;
      contentType: string;
    } | null = {
      buffer: PDF,
      filename: 'acta de recepción.pdf',
      contentType: 'application/pdf',
    },
  ) => {
    const req = request(app.getHttpServer()).post('/api/v1/portal/reembolsos');
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    for (const [campo, valor] of Object.entries(campos)) {
      req.field(campo, valor);
    }
    if (archivo) {
      req.attach('evidencia', archivo.buffer, {
        filename: archivo.filename,
        contentType: archivo.contentType,
      });
    }
    return req;
  };

  const campos = (
    pedidoId: number,
    overrides: Record<string, string> = {},
  ) => ({
    pedido_id: String(pedidoId),
    motivo: MOTIVO,
    descripcion: DESCRIPCION,
    ...overrides,
  });

  const get = (path: string, token: string | undefined) => {
    const req = request(app.getHttpServer()).get(
      `/api/v1/portal/reembolsos${path}`,
    );
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  };

  // Borra en orden de dependencia: notificaciones y solicitudes -> pagos ->
  // pedidos -> clientes y usuarios.
  const deleteTestData = async () => {
    const reembolsos = await prisma.reembolso.findMany({
      where: { pago: { pedido: { codigo: { startsWith: PREFIJO_PEDIDO } } } },
      select: { id: true },
    });
    const reembolsoIds = reembolsos.map(({ id }) => id);
    const notificaciones = await prisma.notificacion.findMany({
      where: {
        referencia_tipo: 'reembolso',
        referencia_id: { in: reembolsoIds.map(String) },
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

    const pedidosE2e = await prisma.pedido.findMany({
      where: { codigo: { startsWith: PREFIJO_PEDIDO } },
      select: { id: true },
    });
    const pedidoIds = pedidosE2e.map(({ id }) => id);
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
        apellido_materno: 'Reembolso E2E',
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
            estado: testUser.cliente === 'activo',
          },
        })
      : null;

    return { userId: user.id, clienteId: cliente?.id ?? null };
  };

  const crearPedido = async (
    n: number,
    clienteId: string,
    estado:
      'confirmado' | 'en_camino' | 'entregado' | 'cancelado' | 'en_preparacion',
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
                    pago.metodo === 'culqi' ? `chr_e2e_sr_${n}` : null,
                  fecha_pago: new Date(),
                },
              },
            }
          : {}),
      },
    });
    return pedido.id;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Service)
      .useValue(fakeS3)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    // Limpia restos de una corrida anterior que haya quedado a medias.
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

    const cliente = clienteIds.cliente!;
    pedidos.entregado = await crearPedido(1, cliente, 'entregado', {
      metodo: 'culqi',
      monto: 170,
    });
    pedidos.confirmado = await crearPedido(2, cliente, 'confirmado', {
      metodo: 'efectivo',
      monto: 89.5,
    });
    pedidos.enCamino = await crearPedido(3, cliente, 'en_camino', {
      metodo: 'culqi',
      monto: 45,
    });
    pedidos.sinPago = await crearPedido(4, cliente, 'entregado', null);
    pedidos.cancelado = await crearPedido(5, cliente, 'cancelado', {
      metodo: 'culqi',
      monto: 60.25,
    });
    pedidos.ajeno = await crearPedido(6, clienteIds.otro!, 'entregado', {
      metodo: 'culqi',
      monto: 33,
    });
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
    it('POST sin token devuelve 401', async () => {
      await solicitar(campos(pedidos.entregado), undefined).expect(401);
    });

    it('GET sin token devuelve 401', async () => {
      await get('', undefined).expect(401);
      await get('/1', undefined).expect(401);
    });

    it.each(['admin', 'ventas'] as const)(
      'con rol %s devuelve 403',
      async (rol) => {
        await solicitar(campos(pedidos.entregado), tokens[rol]).expect(403);
        await get('', tokens[rol]).expect(403);
        await get('/1', tokens[rol]).expect(403);
      },
    );
  });

  describe('validación (400)', () => {
    it('sin archivo de evidencia', async () => {
      await solicitar(campos(pedidos.entregado), tokens.cliente, null).expect(
        400,
      );
    });

    it('con un tipo de archivo no admitido', async () => {
      await solicitar(campos(pedidos.entregado), tokens.cliente, {
        buffer: GIF,
        filename: 'evidencia.gif',
        contentType: 'image/gif',
      }).expect(400);
    });

    it('con un texto que dice ser PDF', async () => {
      await solicitar(campos(pedidos.entregado), tokens.cliente, {
        buffer: Buffer.from('no soy un pdf'),
        filename: 'falso.pdf',
        contentType: 'application/pdf',
      }).expect(400);
    });

    it('con una imagen real declarada como text/html', async () => {
      await solicitar(campos(pedidos.entregado), tokens.cliente, {
        buffer: PNG,
        filename: 'foto.png',
        contentType: 'text/html',
      }).expect(400);
    });

    it('con una evidencia de más de 5 MB', async () => {
      const grande = Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]);

      await solicitar(campos(pedidos.entregado), tokens.cliente, {
        buffer: grande,
        filename: 'grande.pdf',
        contentType: 'application/pdf',
      }).expect(400);
    });

    it('con el motivo vacío o solo espacios', async () => {
      await solicitar(
        campos(pedidos.entregado, { motivo: '   ' }),
        tokens.cliente,
      ).expect(400);
      await solicitar(
        { pedido_id: String(pedidos.entregado), descripcion: DESCRIPCION },
        tokens.cliente,
      ).expect(400);
    });

    it('con una descripción de menos de 10 caracteres', async () => {
      await solicitar(
        campos(pedidos.entregado, { descripcion: '  corta   ' }),
        tokens.cliente,
      ).expect(400);
    });

    it('con un pedido_id que no es un número', async () => {
      await solicitar(
        campos(pedidos.entregado, { pedido_id: 'abc' }),
        tokens.cliente,
      ).expect(400);
    });

    it('ninguna petición inválida dejó archivos ni solicitudes', async () => {
      expect(fakeS3.subidas).toEqual([]);
      expect(
        await prisma.reembolso.count({
          where: { pago: { pedido_id: pedidos.entregado } },
        }),
      ).toBe(0);
    });
  });

  describe('reglas del pedido (404, 409)', () => {
    it('un pedido de otro cliente devuelve 404', async () => {
      await solicitar(campos(pedidos.ajeno), tokens.cliente).expect(404);
    });

    it('un pedido que no existe devuelve 404', async () => {
      await solicitar(campos(999999999), tokens.cliente).expect(404);
    });

    it('un usuario sin cliente devuelve 404', async () => {
      await solicitar(campos(pedidos.entregado), tokens.sinCliente).expect(404);
    });

    it('un cliente inactivo devuelve 409', async () => {
      await solicitar(campos(pedidos.entregado), tokens.inactivo).expect(409);
    });

    it('un pedido sin pago devuelve 409', async () => {
      const response = await solicitar(
        campos(pedidos.sinPago),
        tokens.cliente,
      ).expect(409);

      expect((response.body as { message: string }).message).toBe(
        `El pedido ${PREFIJO_PEDIDO}4 no tiene un pago registrado; no se puede reembolsar`,
      );
    });

    it('un pedido en camino devuelve 409', async () => {
      await solicitar(campos(pedidos.enCamino), tokens.cliente).expect(409);
    });

    it('nada de lo rechazado subió archivos', () => {
      expect(fakeS3.subidas).toEqual([]);
    });
  });

  describe('registrar la solicitud (201)', () => {
    it('registra la solicitud pendiente con código SOL-, monto del pago y evidencia', async () => {
      const response = await solicitar(
        campos(pedidos.entregado),
        tokens.cliente,
      ).expect(201);
      const body = response.body as SolicitudBody;
      solicitudes.entregado = body.id;

      expect(body.codigo).toMatch(/^SOL-\d{6,}$/);
      expect(body.codigo).toBe(`SOL-${String(body.id).padStart(6, '0')}`);
      expect(body).toMatchObject({
        pedido: { id: pedidos.entregado, codigo: `${PREFIJO_PEDIDO}1` },
        monto: 170,
        estado: 'pendiente',
        motivo_cliente: `${MOTIVO}: ${DESCRIPCION}`,
        motivo_rechazo: null,
        fecha_resolucion: null,
      });
      expect(body).not.toHaveProperty('resuelto_por');
      expect(body).not.toHaveProperty('cliente');

      const key = `reembolsos/${body.codigo}/acta-de-recepcion.pdf`;
      expect(body.evidencia).toEqual({
        nombre: 'acta-de-recepcion.pdf',
        url: `https://fake-s3.test/docs/${key}`,
      });
      expect(fakeS3.objeto('docs', key)?.contentType).toBe('application/pdf');

      const guardado = await prisma.reembolso.findUniqueOrThrow({
        where: { id: body.id },
        include: { pago: true },
      });
      expect(guardado.evidencia_key).toBe(key);
      expect(guardado.pago.pedido_id).toBe(pedidos.entregado);
      expect(guardado.resuelto_por).toBeNull();
    });

    it('acepta una imagen PNG para un pedido confirmado', async () => {
      const response = await solicitar(
        campos(pedidos.confirmado),
        tokens.cliente,
        { buffer: PNG, filename: 'foto.png', contentType: 'image/png' },
      ).expect(201);
      const body = response.body as SolicitudBody;
      solicitudes.confirmado = body.id;

      expect(body).toMatchObject({ monto: 89.5, estado: 'pendiente' });
      expect(body.evidencia?.nombre).toBe('foto.png');
    });

    it('una segunda solicitud del mismo pedido devuelve 409 y no deja archivo', async () => {
      const antes = fakeS3.subidas.length;

      const response = await solicitar(
        campos(pedidos.entregado),
        tokens.cliente,
      ).expect(409);

      expect((response.body as { message: string }).message).toBe(
        `El pedido ${PREFIJO_PEDIDO}1 ya tiene una solicitud de reembolso registrada`,
      );
      expect(fakeS3.subidas).toHaveLength(antes);
    });

    it('dos solicitudes a la vez del mismo pedido: una 201, otra 409 y sin huérfanos en S3', async () => {
      const respuestas = await Promise.all([
        solicitar(campos(pedidos.cancelado), tokens.cliente),
        solicitar(campos(pedidos.cancelado), tokens.cliente),
      ]);

      expect(respuestas.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(
        await prisma.reembolso.count({
          where: { pago: { pedido_id: pedidos.cancelado } },
        }),
      ).toBe(1);

      // Cada archivo subido sigue en el bucket solo si su solicitud existe.
      const guardadas = await prisma.reembolso.findMany({
        where: { pago: { pedido: { codigo: { startsWith: PREFIJO_PEDIDO } } } },
        select: { evidencia_key: true },
      });
      const keysGuardadas = new Set(guardadas.map((r) => r.evidencia_key));
      for (const key of fakeS3.subidas) {
        expect(fakeS3.existe('docs', key)).toBe(keysGuardadas.has(key));
      }
    });

    it('el otro cliente registra la suya sobre su propio pedido', async () => {
      const response = await solicitar(
        campos(pedidos.ajeno),
        tokens.otro,
      ).expect(201);
      solicitudes.ajena = (response.body as SolicitudBody).id;
    });
  });

  describe('consultar mis solicitudes (RF-B41)', () => {
    it('lista solo las propias, las más recientes primero', async () => {
      const response = await get('', tokens.cliente).expect(200);
      const body = response.body as ListadoBody;
      const ids = body.data.map((s) => s.id);

      expect(body.meta.total).toBe(3);
      expect(ids).toEqual(
        expect.arrayContaining([solicitudes.entregado, solicitudes.confirmado]),
      );
      expect(ids).not.toContain(solicitudes.ajena);
      expect(body.data[0]).not.toHaveProperty('resuelto_por');
    });

    it('filtra por estado', async () => {
      const response = await get('', tokens.cliente)
        .query({ estado: 'aprobado' })
        .expect(200);

      expect((response.body as ListadoBody).meta.total).toBe(0);
    });

    it('un estado que no existe devuelve 400', async () => {
      await get('', tokens.cliente).query({ estado: 'devuelto' }).expect(400);
    });

    it('el detalle propio trae el estado, el motivo y la evidencia firmada', async () => {
      const response = await get(
        `/${solicitudes.entregado}`,
        tokens.cliente,
      ).expect(200);
      const body = response.body as SolicitudBody;

      expect(body).toMatchObject({
        id: solicitudes.entregado,
        estado: 'pendiente',
        motivo_cliente: `${MOTIVO}: ${DESCRIPCION}`,
        motivo_rechazo: null,
      });
      expect(body.evidencia?.url).toBe(
        `https://fake-s3.test/docs/reembolsos/${body.codigo}/acta-de-recepcion.pdf`,
      );
    });

    it('el detalle de una solicitud ajena devuelve 404', async () => {
      await get(`/${solicitudes.ajena}`, tokens.cliente).expect(404);
    });

    it('una solicitud que no existe devuelve 404', async () => {
      await get('/999999999', tokens.cliente).expect(404);
    });
  });

  describe('flujo completo con ventas', () => {
    it('ventas aprueba la solicitud del cliente (tiene evidencia) y el cliente la ve aprobada', async () => {
      const aprobada = await request(app.getHttpServer())
        .patch(`/api/v1/reembolsos/${solicitudes.entregado}/aprobar`)
        .set('Authorization', `Bearer ${tokens.ventas}`)
        .expect(200);
      expect((aprobada.body as SolicitudBody).estado).toBe('aprobado');

      const response = await get(
        `/${solicitudes.entregado}`,
        tokens.cliente,
      ).expect(200);
      const body = response.body as SolicitudBody;
      expect(body.estado).toBe('aprobado');
      expect(body.fecha_resolucion).not.toBeNull();

      const notificaciones = await prisma.notificacion.findMany({
        where: {
          referencia_tipo: 'reembolso',
          referencia_id: String(solicitudes.entregado),
        },
        include: { notificacion_users: true },
      });
      expect(notificaciones).toEqual([
        expect.objectContaining({
          tipo: 'reembolso_aprobado',
          notificacion_users: [
            expect.objectContaining({ user_id: userIds.cliente }),
          ],
        }),
      ]);
    });

    it('el filtro por estado ya encuentra la aprobada', async () => {
      const response = await get('', tokens.cliente)
        .query({ estado: 'aprobado' })
        .expect(200);

      expect((response.body as ListadoBody).data.map((s) => s.id)).toEqual([
        solicitudes.entregado,
      ]);
    });
  });
});
