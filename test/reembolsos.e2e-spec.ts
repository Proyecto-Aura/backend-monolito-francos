import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';

const ADMIN_CREDENTIALS = { identificador: 'admin', password: 'admin123' };

// `ventas` gestiona los reembolsos; `inventario` es un rol sin acceso.
const TEST_USERS = {
  ventas: {
    identificador: 'e2e-ventas-reembolsos',
    password: 'VentasE2e123',
    email: 'e2e-ventas-reembolsos@francos.test',
    documento: '99999971',
    rol: 'ventas',
  },
  inventario: {
    identificador: 'e2e-inv-reembolsos',
    password: 'InvE2e1234',
    email: 'e2e-inv-reembolsos@francos.test',
    documento: '99999972',
    rol: 'inventario',
  },
} as const;

// Cliente con cuenta en el portal, para comprobar que recibe los avisos.
const CLIENTE = {
  documento: '99999973',
  email: 'e2e-cliente-reembolsos@francos.test',
  identificador: 'e2e-cliente-reembolsos',
};

// Marcas para reconocer (y borrar) solo los datos que crea este archivo.
const CATEGORIA_NOMBRE = 'E2E Categoría Reembolsos OFT0-253';
const PRESENTACION_DESCRIPCION = 'E2E Reembolsos OFT0-253';
const PRODUCTO_NOMBRE = 'E2E Producto Reembolsos OFT0-253';
const PREFIJO_PEDIDO = 'PED-E2E-R';
const PREFIJO_SOLICITUD = 'SOL-E2E-R';

interface ReembolsoBody {
  id: number;
  codigo: string;
  pedido: { id: number; codigo: string };
  cliente: { nombre: string };
  metodo_pago: string;
  monto: number;
  estado: string;
  fecha_solicitud: string;
  motivo_cliente: string;
  evidencia: { nombre: string; url: string } | null;
  motivo_rechazo: string | null;
  fecha_resolucion: string | null;
}

interface ListadoBody {
  data: ReembolsoBody[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

describe('Reembolsos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  let ventasToken: string;
  let ventasUserId: string;
  let inventarioToken: string;
  let clienteUserId: string;

  // Solicitudes que crea este archivo, por escenario.
  const ids = {
    conEvidencia: 0,
    sinEvidencia: 0,
    paraRechazar: 0,
    efectivo: 0,
  };

  const login = async (credentials: {
    identificador: string;
    password: string;
  }) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identificador: credentials.identificador,
        password: credentials.password,
      });

    expect([200, 201]).toContain(response.status);
    return (response.body as unknown as { access_token: string }).access_token;
  };

  const deleteUser = async (
    documento: string,
    username: string,
    email: string,
  ) => {
    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
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

    await prisma.persona.deleteMany({ where: { numero_documento: documento } });
  };

  // Borra en orden de dependencia: notificaciones y reembolsos -> pago y
  // detalle -> pedido -> cliente y usuarios -> catálogo.
  const deleteTestData = async () => {
    const reembolsos = await prisma.reembolso.findMany({
      where: { codigo: { startsWith: PREFIJO_SOLICITUD } },
      select: { id: true },
    });
    const notificaciones = await prisma.notificacion.findMany({
      where: {
        referencia_tipo: 'reembolso',
        referencia_id: { in: reembolsos.map(({ id }) => String(id)) },
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
    await prisma.reembolso.deleteMany({
      where: { codigo: { startsWith: PREFIJO_SOLICITUD } },
    });

    const pedidos = await prisma.pedido.findMany({
      where: { codigo: { startsWith: PREFIJO_PEDIDO } },
      select: { id: true },
    });
    const pedidoIds = pedidos.map(({ id }) => id);

    await prisma.pago.deleteMany({ where: { pedido_id: { in: pedidoIds } } });
    await prisma.detallePedido.deleteMany({
      where: { pedido_id: { in: pedidoIds } },
    });
    await prisma.pedido.deleteMany({ where: { id: { in: pedidoIds } } });
    await prisma.cliente.deleteMany({
      where: { persona: { numero_documento: CLIENTE.documento } },
    });

    await deleteUser(CLIENTE.documento, CLIENTE.identificador, CLIENTE.email);
    for (const testUser of Object.values(TEST_USERS)) {
      await deleteUser(
        testUser.documento,
        testUser.identificador,
        testUser.email,
      );
    }

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
        nombres: 'Usuario',
        apellido_paterno: testUser.rol,
        apellido_materno: 'Reembolsos E2E',
        tipo_documento: 'dni',
        numero_documento: testUser.documento,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: testUser.email,
        username: testUser.identificador,
        contrasena: await hashPassword(testUser.password),
        estado: true,
        email_verificado: true,
      },
    });

    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: rol.id, estado: true },
    });
    return user.id;
  };

  const get = (path: string, token = ventasToken) =>
    request(app.getHttpServer())
      .get(`/api/v1/reembolsos${path}`)
      .set('Authorization', `Bearer ${token}`);

  const patch = (path: string, body?: object, token = ventasToken) =>
    request(app.getHttpServer())
      .patch(`/api/v1/reembolsos${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const notificacionesDe = (reembolsoId: number) =>
    prisma.notificacion.findMany({
      where: {
        referencia_tipo: 'reembolso',
        referencia_id: String(reembolsoId),
      },
      include: { notificacion_users: true },
      orderBy: { id: 'asc' },
    });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    ventasUserId = await createTestUser(TEST_USERS.ventas);
    await createTestUser(TEST_USERS.inventario);
    ventasToken = await login(TEST_USERS.ventas);
    inventarioToken = await login(TEST_USERS.inventario);

    const personaCliente = await prisma.persona.create({
      data: {
        nombres: 'Rosa Elena',
        apellido_paterno: 'Quispe',
        apellido_materno: 'Huamán',
        tipo_documento: 'dni',
        numero_documento: CLIENTE.documento,
      },
    });
    const userCliente = await prisma.user.create({
      data: {
        persona_id: personaCliente.id,
        email: CLIENTE.email,
        username: CLIENTE.identificador,
        contrasena: await hashPassword('ClienteE2e123'),
      },
    });
    clienteUserId = userCliente.id;
    const cliente = await prisma.cliente.create({
      data: {
        persona_id: personaCliente.id,
        tipo_cliente: 'persona_natural',
        categoria_cliente: 'minorista',
      },
    });

    const categoria = await prisma.categoria.create({
      data: { nombre: CATEGORIA_NOMBRE },
    });
    const presentacion = await prisma.presentacion.create({
      data: {
        cantidad: 7791,
        unidad_medida: 'gr',
        descripcion: PRESENTACION_DESCRIPCION,
      },
    });
    const producto = await prisma.producto.create({
      data: { categoria_id: categoria.id, nombre: PRODUCTO_NOMBRE },
    });
    const productoPresentacion = await prisma.productoPresentacion.create({
      data: {
        sku: 'E2E-REEMBOLSOS-7791',
        precio_unitario: 8.5,
        producto_id: producto.id,
        presentacion_id: presentacion.id,
      },
    });

    // Un pedido pagado por solicitud: el pago es único por solicitud.
    const crearSolicitud = async (
      n: number,
      metodo: 'culqi' | 'efectivo',
      evidencia: string | null,
    ) => {
      const pedido = await prisma.pedido.create({
        data: {
          codigo: `${PREFIJO_PEDIDO}${n}`,
          cliente_id: cliente.id,
          origen: 'manual',
          estado: 'entregado',
          tipo_entrega: 'recojo_tienda',
          total: 170,
          detalles: {
            create: {
              producto_presentacion_id: productoPresentacion.id,
              cantidad: 20,
              precio_unitario: 8.5,
              precio_aplicado: 8.5,
              subtotal: 170,
            },
          },
          pago: {
            create: {
              metodo_pago: metodo,
              monto: 170,
              numero_operacion: metodo === 'culqi' ? `chr_e2e_r_${n}` : null,
              fecha_pago: new Date(),
            },
          },
        },
        include: { pago: true },
      });
      const codigo = `${PREFIJO_SOLICITUD}${n}`;

      const reembolso = await prisma.reembolso.create({
        data: {
          codigo,
          pago_id: pedido.pago!.id,
          monto: 170,
          motivo_cliente: 'El pedido llegó con packs rotos.',
          evidencia_key: evidencia ? `reembolsos/${codigo}/${evidencia}` : null,
        },
      });
      return reembolso.id;
    };

    ids.conEvidencia = await crearSolicitud(1, 'culqi', 'packs-rotos.jpg');
    ids.sinEvidencia = await crearSolicitud(2, 'culqi', null);
    ids.paraRechazar = await crearSolicitud(3, 'culqi', 'chat-cliente.png');
    ids.efectivo = await crearSolicitud(4, 'efectivo', 'acta.pdf');
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
    it('GET /api/v1/reembolsos sin token devuelve 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/reembolsos').expect(401);
    });

    it('PATCH /api/v1/reembolsos/:id/aprobar sin token devuelve 401', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/reembolsos/${ids.conEvidencia}/aprobar`)
        .expect(401);
    });

    it('GET /api/v1/reembolsos con rol inventario devuelve 403', async () => {
      await get('', inventarioToken).expect(403);
    });

    it('PATCH /api/v1/reembolsos/:id/rechazar con rol inventario devuelve 403', async () => {
      await patch(
        `/${ids.paraRechazar}/rechazar`,
        { motivo_rechazo: 'x' },
        inventarioToken,
      ).expect(403);
    });
  });

  describe('listar y filtrar (RF-A039, RF-A040)', () => {
    it('lista las solicitudes con su pedido, cliente, importe, estado y fecha', async () => {
      const response = await get('')
        .query({ q: PREFIJO_SOLICITUD, limit: 100 })
        .expect(200);
      const body = response.body as unknown as ListadoBody;

      expect(body.meta.total).toBe(4);
      expect(body.data.find((r) => r.id === ids.conEvidencia)).toMatchObject({
        codigo: `${PREFIJO_SOLICITUD}1`,
        pedido: { codigo: `${PREFIJO_PEDIDO}1` },
        cliente: { nombre: 'Rosa Elena Quispe Huamán' },
        metodo_pago: 'culqi',
        monto: 170,
        estado: 'pendiente',
      });
    });

    it('filtra por estado', async () => {
      const response = await get('')
        .query({ q: PREFIJO_SOLICITUD, estado: 'rechazado' })
        .expect(200);

      expect((response.body as unknown as ListadoBody).meta.total).toBe(0);
    });

    it('busca por nombre del cliente', async () => {
      const response = await get('')
        .query({ q: 'quispe', limit: 100 })
        .expect(200);
      const codigos = (response.body as unknown as ListadoBody).data.map(
        (r) => r.codigo,
      );

      expect(codigos).toEqual(
        expect.arrayContaining([`${PREFIJO_SOLICITUD}1`]),
      );
    });

    it('un estado que no existe devuelve 400', async () => {
      await get('').query({ estado: 'devuelto' }).expect(400);
    });
  });

  describe('detalle (RF-A041)', () => {
    it('devuelve el motivo, la evidencia con su enlace y el monto', async () => {
      const response = await get(`/${ids.conEvidencia}`).expect(200);
      const body = response.body as unknown as ReembolsoBody;

      expect(body).toMatchObject({
        motivo_cliente: 'El pedido llegó con packs rotos.',
        monto: 170,
        motivo_rechazo: null,
        fecha_resolucion: null,
      });
      expect(body.evidencia?.nombre).toBe('packs-rotos.jpg');
      expect(body.evidencia?.url).toContain('packs-rotos.jpg');
    });

    it('sin evidencia la devuelve vacía', async () => {
      const response = await get(`/${ids.sinEvidencia}`).expect(200);

      expect((response.body as unknown as ReembolsoBody).evidencia).toBeNull();
    });

    it('una solicitud que no existe devuelve 404', async () => {
      await get('/999999999').expect(404);
    });
  });

  describe('aprobar (RF-A042)', () => {
    it('sin evidencia adjunta devuelve 409', async () => {
      const response = await patch(`/${ids.sinEvidencia}/aprobar`).expect(409);

      expect((response.body as unknown as { message: string }).message).toBe(
        `No se puede aprobar ${PREFIJO_SOLICITUD}2: la solicitud requiere motivo y evidencia adjunta`,
      );
    });

    it('aprueba la solicitud, guarda quién la resolvió y avisa al cliente', async () => {
      const response = await patch(`/${ids.conEvidencia}/aprobar`).expect(200);
      const body = response.body as unknown as ReembolsoBody;

      expect(body.estado).toBe('aprobado');
      expect(body.fecha_resolucion).not.toBeNull();

      const guardado = await prisma.reembolso.findUniqueOrThrow({
        where: { id: ids.conEvidencia },
      });
      expect(guardado.resuelto_por).toBe(ventasUserId);

      const notificaciones = await notificacionesDe(ids.conEvidencia);
      expect(notificaciones).toHaveLength(1);
      expect(notificaciones[0]).toMatchObject({ tipo: 'reembolso_aprobado' });
      expect(notificaciones[0].notificacion_users).toEqual([
        expect.objectContaining({ user_id: clienteUserId, leido: false }),
      ]);
    });

    it('una solicitud ya aprobada no se vuelve a aprobar (409)', async () => {
      await patch(`/${ids.conEvidencia}/aprobar`).expect(409);
    });
  });

  describe('rechazar (RF-A043)', () => {
    it('sin motivo devuelve 400', async () => {
      await patch(`/${ids.paraRechazar}/rechazar`, {}).expect(400);
      await patch(`/${ids.paraRechazar}/rechazar`, {
        motivo_rechazo: '   ',
      }).expect(400);
    });

    it('rechaza la solicitud con el motivo y avisa al cliente', async () => {
      const response = await patch(`/${ids.paraRechazar}/rechazar`, {
        motivo_rechazo: 'Fuera del plazo de 48 horas.',
      }).expect(200);

      expect(response.body).toMatchObject({
        estado: 'rechazado',
        motivo_rechazo: 'Fuera del plazo de 48 horas.',
      });

      const notificaciones = await notificacionesDe(ids.paraRechazar);
      expect(notificaciones).toEqual([
        expect.objectContaining({
          tipo: 'reembolso_rechazado',
          mensaje: expect.stringContaining(
            'Fuera del plazo de 48 horas.',
          ) as string,
        }),
      ]);
    });

    it('un rechazo no tiene vuelta atrás: ya no se puede aprobar (409)', async () => {
      await patch(`/${ids.paraRechazar}/aprobar`).expect(409);
    });
  });

  describe('confirmar la devolución de Culqi (RF-A044, simulada)', () => {
    it('una solicitud pendiente todavía no se puede confirmar (409)', async () => {
      await patch(`/${ids.sinEvidencia}/confirmar-devolucion`).expect(409);
    });

    it('pasa a reembolsado una solicitud aprobada pagada con Culqi y avisa al cliente', async () => {
      const response = await patch(
        `/${ids.conEvidencia}/confirmar-devolucion`,
      ).expect(200);

      expect((response.body as unknown as ReembolsoBody).estado).toBe(
        'reembolsado',
      );

      const tipos = (await notificacionesDe(ids.conEvidencia)).map(
        (n) => n.tipo,
      );
      expect(tipos).toEqual(['reembolso_aprobado', 'reembolso_procesado']);
    });

    it('un pago en efectivo no tiene devolución de Culqi que confirmar (409)', async () => {
      await patch(`/${ids.efectivo}/aprobar`).expect(200);
      await patch(`/${ids.efectivo}/confirmar-devolucion`).expect(409);
    });
  });
});
