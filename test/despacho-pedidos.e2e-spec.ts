import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';

const ADMIN_CREDENTIALS = { identificador: 'admin', password: 'admin123' };

// `despacho` opera los pedidos; `ventas` no despacha (RN6).
const TEST_USERS = {
  despacho: {
    identificador: 'e2e-despacho-pedidos',
    password: 'VentasE2e123',
    email: 'e2e-despacho-pedidos@francos.test',
    documento: '99999971',
    rol: 'despacho',
  },
  ventas: {
    identificador: 'e2e-ventas-despacho',
    password: 'VentasE2e123',
    email: 'e2e-ventas-despacho@francos.test',
    documento: '99999972',
    rol: 'ventas',
  },
} as const;

// Cliente con usuario del portal (recibe la notificación y tiene rol cliente)
// y cliente de un pedido manual sin usuario.
const CLIENTE_CON_USUARIO = {
  documento: '99999973',
  identificador: 'e2e-cliente-despacho',
  email: 'e2e-cliente-despacho@francos.test',
  password: 'ClienteE2e123',
};
const CLIENTE_SIN_USUARIO = { documento: '99999974' };

// Marcas para reconocer (y borrar) solo los datos que crea este archivo.
const CATEGORIA_NOMBRE = 'E2E Categoría Despacho OFT0-409';
const PRESENTACION_DESCRIPCION = 'E2E Despacho OFT0-409';
const PRODUCTO_NOMBRE = 'E2E Producto Despacho OFT0-409';
const CODIGO_PREFIJO = 'E2E-DSP-';

const STOCK_INICIAL = 20;

interface PedidoBody {
  id: number;
  codigo: string;
  estado: string;
  fecha_entrega: string | null;
}

interface ListadoBody {
  data: PedidoBody[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

describe('Despacho de pedidos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  let adminToken: string;
  let despachoToken: string;
  let ventasToken: string;
  let clienteToken: string;
  let clienteUserId: string;
  let presentacionConStockId: number;
  let presentacionSinStockId: number;

  // Pedidos sembrados directo en la base: nadie los lleva todavía a
  // pendiente_entrega (HU-A-018).
  let pedidoPendienteId: number;
  let pedidoSinUsuarioId: number;
  let pedidoConfirmadoId: number;
  let pedidoSinStockId: number;
  let pedidoEntregadoId: number;

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
    const body = response.body as unknown as { access_token: string };
    expect(body).toHaveProperty('access_token');
    return body.access_token;
  };

  const deleteUserByDocumento = async (
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

  // Borra en orden de dependencia: notificaciones -> detalle -> pedido ->
  // stock -> clientes y usuarios -> catálogo.
  const deleteTestData = async () => {
    const pedidos = await prisma.pedido.findMany({
      where: { codigo: { startsWith: CODIGO_PREFIJO } },
      select: { id: true },
    });
    const pedidoIds = pedidos.map(({ id }) => id);
    const referencias = pedidoIds.map(String);

    const notificaciones = await prisma.notificacion.findMany({
      where: { referencia_tipo: 'pedido', referencia_id: { in: referencias } },
      select: { id: true },
    });
    const notificacionIds = notificaciones.map(({ id }) => id);
    await prisma.notificacionUser.deleteMany({
      where: { notificacion_id: { in: notificacionIds } },
    });
    await prisma.notificacion.deleteMany({
      where: { id: { in: notificacionIds } },
    });

    await prisma.detallePedido.deleteMany({
      where: { pedido_id: { in: pedidoIds } },
    });
    await prisma.pedido.deleteMany({ where: { id: { in: pedidoIds } } });
    await prisma.cliente.deleteMany({
      where: {
        persona: {
          numero_documento: {
            in: [CLIENTE_CON_USUARIO.documento, CLIENTE_SIN_USUARIO.documento],
          },
        },
      },
    });

    await deleteUserByDocumento(
      CLIENTE_CON_USUARIO.documento,
      CLIENTE_CON_USUARIO.identificador,
      CLIENTE_CON_USUARIO.email,
    );
    await prisma.persona.deleteMany({
      where: { numero_documento: CLIENTE_SIN_USUARIO.documento },
    });
    for (const testUser of Object.values(TEST_USERS)) {
      await deleteUserByDocumento(
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
    await prisma.productoTerminado.deleteMany({
      where: { producto_presentacion: { producto_id: { in: productoIds } } },
    });
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
        apellido_materno: 'Despacho E2E',
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
  };

  const sufijo = Date.now().toString(36);
  let secuencia = 0;

  const sembrarPedido = async (
    clienteId: string,
    estado: 'confirmado' | 'pendiente_entrega' | 'en_camino' | 'entregado',
    presentacionId: number,
    cantidad: number,
  ) => {
    secuencia += 1;
    const pedido = await prisma.pedido.create({
      data: {
        codigo: `${CODIGO_PREFIJO}${sufijo}-${secuencia}`,
        cliente_id: clienteId,
        origen: 'manual',
        estado,
        tipo_entrega: 'delivery',
        direccion_entrega: 'Jr. Huallaga 320, Cercado de Lima',
        total: cantidad * 10,
        detalles: {
          create: {
            producto_presentacion_id: presentacionId,
            cantidad,
            precio_unitario: 10,
            precio_aplicado: 10,
            subtotal: cantidad * 10,
          },
        },
      },
    });
    return pedido.id;
  };

  const stockDe = async (presentacionId: number) => {
    const { stock_actual } = await prisma.productoTerminado.findUniqueOrThrow({
      where: { producto_presentacion_id: presentacionId },
      select: { stock_actual: true },
    });
    return stock_actual.toNumber();
  };

  const estadoDe = async (id: number) =>
    (
      await prisma.pedido.findUniqueOrThrow({
        where: { id },
        select: { estado: true },
      })
    ).estado;

  const listar = (
    query: Record<string, string | number>,
    token: string | null = despachoToken,
  ) => {
    const req = request(app.getHttpServer())
      .get('/api/v1/despacho/pedidos')
      .query(query);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  const detalle = (
    id: number | string,
    token: string | null = despachoToken,
  ) => {
    const req = request(app.getHttpServer()).get(
      `/api/v1/despacho/pedidos/${id}`,
    );
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  const patch = (
    id: number | string,
    accion: 'en-camino' | 'entregado',
    token: string | null = despachoToken,
  ) => {
    const req = request(app.getHttpServer()).patch(
      `/api/v1/despacho/pedidos/${id}/${accion}`,
    );
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

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

    // Catálogo: una presentación con stock de sobra y otra casi sin stock.
    const categoria = await prisma.categoria.create({
      data: { nombre: CATEGORIA_NOMBRE },
    });
    const presentaciones = await Promise.all(
      [7791, 7792].map((cantidad) =>
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
    const crearPresentacion = async (presentacionId: number, stock: number) => {
      const productoPresentacion = await prisma.productoPresentacion.create({
        data: {
          sku: `FR-P${producto.id}-PR${presentacionId}`,
          producto_id: producto.id,
          presentacion_id: presentacionId,
          precio_unitario: 10,
        },
      });
      await prisma.productoTerminado.create({
        data: {
          producto_presentacion_id: productoPresentacion.id,
          stock_actual: stock,
        },
      });
      return productoPresentacion.id;
    };
    presentacionConStockId = await crearPresentacion(
      presentaciones[0].id,
      STOCK_INICIAL,
    );
    presentacionSinStockId = await crearPresentacion(presentaciones[1].id, 2);

    // Cliente con usuario del portal y rol cliente.
    const rolCliente = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'cliente' },
    });
    const personaConUsuario = await prisma.persona.create({
      data: {
        nombres: 'Luis Alberto',
        apellido_paterno: 'Mamani',
        apellido_materno: 'Condori',
        tipo_documento: 'dni',
        numero_documento: CLIENTE_CON_USUARIO.documento,
      },
    });
    clienteUserId = (
      await prisma.user.create({
        data: {
          persona_id: personaConUsuario.id,
          email: CLIENTE_CON_USUARIO.email,
          username: CLIENTE_CON_USUARIO.identificador,
          contrasena: await hashPassword(CLIENTE_CON_USUARIO.password),
          estado: true,
          email_verificado: true,
        },
      })
    ).id;
    await prisma.usuarioRol.create({
      data: { user_id: clienteUserId, rol_id: rolCliente.id, estado: true },
    });
    const clienteConUsuarioId = (
      await prisma.cliente.create({
        data: {
          persona_id: personaConUsuario.id,
          tipo_cliente: 'persona_natural',
          categoria_cliente: 'minorista',
        },
      })
    ).id;

    // Cliente de un pedido manual, sin cuenta en el portal.
    const personaSinUsuario = await prisma.persona.create({
      data: {
        nombres: 'Carmen Rosa',
        apellido_paterno: 'Flores',
        apellido_materno: 'Ccahuana',
        tipo_documento: 'dni',
        numero_documento: CLIENTE_SIN_USUARIO.documento,
      },
    });
    const clienteSinUsuarioId = (
      await prisma.cliente.create({
        data: {
          persona_id: personaSinUsuario.id,
          tipo_cliente: 'persona_natural',
          categoria_cliente: 'minorista',
        },
      })
    ).id;

    pedidoPendienteId = await sembrarPedido(
      clienteConUsuarioId,
      'pendiente_entrega',
      presentacionConStockId,
      3,
    );
    pedidoSinUsuarioId = await sembrarPedido(
      clienteSinUsuarioId,
      'pendiente_entrega',
      presentacionConStockId,
      1,
    );
    pedidoConfirmadoId = await sembrarPedido(
      clienteConUsuarioId,
      'confirmado',
      presentacionConStockId,
      1,
    );
    pedidoSinStockId = await sembrarPedido(
      clienteConUsuarioId,
      'en_camino',
      presentacionSinStockId,
      5,
    );
    pedidoEntregadoId = await sembrarPedido(
      clienteConUsuarioId,
      'entregado',
      presentacionConStockId,
      1,
    );

    await createTestUser(TEST_USERS.despacho);
    await createTestUser(TEST_USERS.ventas);

    despachoToken = await login(TEST_USERS.despacho);
    ventasToken = await login(TEST_USERS.ventas);
    clienteToken = await login(CLIENTE_CON_USUARIO);
    adminToken = await login(ADMIN_CREDENTIALS);
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

  describe('autorización (CA-12)', () => {
    it('sin token devuelve 401 en los cuatro endpoints', async () => {
      await listar({}, null).expect(401);
      await detalle(pedidoPendienteId, null).expect(401);
      await patch(pedidoPendienteId, 'en-camino', null).expect(401);
      await patch(pedidoSinStockId, 'entregado', null).expect(401);
    });

    it.each(['ventas', 'cliente'])(
      'con rol %s devuelve 403 y no cambia nada',
      async (rol) => {
        const token = rol === 'ventas' ? ventasToken : clienteToken;

        await listar({}, token).expect(403);
        await detalle(pedidoPendienteId, token).expect(403);
        await patch(pedidoPendienteId, 'en-camino', token).expect(403);
        await patch(pedidoSinStockId, 'entregado', token).expect(403);

        await expect(estadoDe(pedidoPendienteId)).resolves.toBe(
          'pendiente_entrega',
        );
        await expect(estadoDe(pedidoSinStockId)).resolves.toBe('en_camino');
      },
    );

    it('con rol admin puede listar', async () => {
      await listar({ limit: 100 }, adminToken).expect(200);
    });
  });

  describe('listar (CA-1 a CA-3)', () => {
    it('devuelve solo pendiente_entrega, en_camino y entregado', async () => {
      const response = await listar({ limit: 100 }).expect(200);
      const body = response.body as unknown as ListadoBody;
      const ids = body.data.map((p) => p.id);

      expect(
        body.data.every((p) =>
          ['pendiente_entrega', 'en_camino', 'entregado'].includes(p.estado),
        ),
      ).toBe(true);
      expect(ids).toEqual(
        expect.arrayContaining([
          pedidoPendienteId,
          pedidoSinUsuarioId,
          pedidoSinStockId,
          pedidoEntregadoId,
        ]),
      );
      expect(ids).not.toContain(pedidoConfirmadoId);
      expect(body.data.find((p) => p.id === pedidoPendienteId)).toMatchObject({
        estado: 'pendiente_entrega',
        fecha_entrega: null,
      });
    });

    it('filtra por uno de los estados de despacho', async () => {
      const response = await listar({ estado: 'en_camino', limit: 100 }).expect(
        200,
      );
      const body = response.body as unknown as ListadoBody;

      expect(body.data.every((p) => p.estado === 'en_camino')).toBe(true);
      expect(body.data.map((p) => p.id)).toContain(pedidoSinStockId);
      expect(body.data.map((p) => p.id)).not.toContain(pedidoPendienteId);
    });

    it.each(['confirmado', 'cancelado', 'completado'])(
      'con estado %s devuelve 400',
      async (estado) => {
        await listar({ estado }).expect(400);
      },
    );
  });

  describe('detalle (CA-4)', () => {
    it('devuelve un pedido pendiente de entrega con sus productos', async () => {
      const response = await detalle(pedidoPendienteId).expect(200);

      expect(response.body).toMatchObject({
        id: pedidoPendienteId,
        estado: 'pendiente_entrega',
        fecha_entrega: null,
        cliente: { nombre: 'Luis Alberto Mamani Condori' },
        items: [
          expect.objectContaining({
            producto_presentacion_id: presentacionConStockId,
            cantidad: 3,
          }),
        ],
      });
    });

    it('con un pedido fuera de despacho devuelve 404', async () => {
      await detalle(pedidoConfirmadoId).expect(404);
    });

    it('con un pedido que no existe devuelve 404', async () => {
      await detalle(999999999).expect(404);
    });

    it('con un id que no es número devuelve 400', async () => {
      await detalle('abc').expect(400);
    });
  });

  describe('en camino (CA-5 a CA-7)', () => {
    it('no deja entregar un pedido que aún no salió: 409', async () => {
      await patch(pedidoPendienteId, 'entregado').expect(409);
      await expect(estadoDe(pedidoPendienteId)).resolves.toBe(
        'pendiente_entrega',
      );
    });

    it('pasa el pedido a en camino y notifica al usuario del cliente', async () => {
      const response = await patch(pedidoPendienteId, 'en-camino').expect(200);
      const body = response.body as unknown as PedidoBody;

      expect(body).toMatchObject({
        id: pedidoPendienteId,
        estado: 'en_camino',
        fecha_entrega: null,
      });
      await expect(estadoDe(pedidoPendienteId)).resolves.toBe('en_camino');

      const notificaciones = await prisma.notificacion.findMany({
        where: {
          referencia_tipo: 'pedido',
          referencia_id: String(pedidoPendienteId),
        },
        include: { notificacion_users: true },
      });
      expect(notificaciones).toHaveLength(1);
      expect(notificaciones[0]).toMatchObject({
        tipo: 'pedido_en_camino',
        titulo: 'Tu pedido está en camino',
        mensaje: `Tu pedido ${body.codigo} salió a reparto y está en camino.`,
      });
      expect(notificaciones[0].notificacion_users).toEqual([
        expect.objectContaining({ user_id: clienteUserId, leido: false }),
      ]);
    });

    it('si el cliente no tiene usuario lo pasa a en camino sin notificar', async () => {
      await patch(pedidoSinUsuarioId, 'en-camino').expect(200);

      await expect(estadoDe(pedidoSinUsuarioId)).resolves.toBe('en_camino');
      await expect(
        prisma.notificacion.count({
          where: {
            referencia_tipo: 'pedido',
            referencia_id: String(pedidoSinUsuarioId),
          },
        }),
      ).resolves.toBe(0);
    });

    it('no lo vuelve a sacar si ya está en camino: 409 y sin otra notificación', async () => {
      await patch(pedidoPendienteId, 'en-camino').expect(409);

      await expect(
        prisma.notificacion.count({
          where: {
            referencia_tipo: 'pedido',
            referencia_id: String(pedidoPendienteId),
          },
        }),
      ).resolves.toBe(1);
    });

    it('con un pedido confirmado devuelve 409', async () => {
      await patch(pedidoConfirmadoId, 'en-camino').expect(409);
      await expect(estadoDe(pedidoConfirmadoId)).resolves.toBe('confirmado');
    });

    it('con un pedido que no existe devuelve 404', async () => {
      await patch(999999999, 'en-camino').expect(404);
    });

    it('con un id que no es número devuelve 400', async () => {
      await patch('abc', 'en-camino').expect(400);
    });
  });

  describe('entregado (CA-8 a CA-10)', () => {
    it('marca el pedido como entregado, guarda la fecha y descuenta el stock', async () => {
      const antes = Date.now();
      const response = await patch(pedidoPendienteId, 'entregado').expect(200);
      const body = response.body as unknown as PedidoBody;

      expect(body.estado).toBe('entregado');
      expect(body.fecha_entrega).toEqual(expect.any(String));

      const guardado = await prisma.pedido.findUniqueOrThrow({
        where: { id: pedidoPendienteId },
        select: { estado: true, fecha_entrega: true },
      });
      expect(guardado.estado).toBe('entregado');
      expect(guardado.fecha_entrega?.getTime()).toBeGreaterThanOrEqual(
        antes - 5000,
      );
      await expect(stockDe(presentacionConStockId)).resolves.toBe(
        STOCK_INICIAL - 3,
      );
    });

    it('no lo vuelve a entregar ni descuenta otra vez: 409', async () => {
      await patch(pedidoPendienteId, 'entregado').expect(409);
      await expect(stockDe(presentacionConStockId)).resolves.toBe(
        STOCK_INICIAL - 3,
      );
    });

    it('sin stock suficiente devuelve 409 y no cambia nada', async () => {
      await patch(pedidoSinStockId, 'entregado').expect(409);

      const guardado = await prisma.pedido.findUniqueOrThrow({
        where: { id: pedidoSinStockId },
        select: { estado: true, fecha_entrega: true },
      });
      expect(guardado).toEqual({ estado: 'en_camino', fecha_entrega: null });
      await expect(stockDe(presentacionSinStockId)).resolves.toBe(2);
    });

    it('con un pedido confirmado devuelve 409', async () => {
      await patch(pedidoConfirmadoId, 'entregado').expect(409);
    });

    it('con un pedido que no existe devuelve 404', async () => {
      await patch(999999999, 'entregado').expect(404);
    });
  });
});
