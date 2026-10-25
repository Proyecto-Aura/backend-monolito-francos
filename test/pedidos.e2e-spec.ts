import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { fechaHoy } from '../src/modules/catalog/application/utils/promocion.utils';
import {
  CobroParams,
  CobroResultado,
  PasarelaPagoService,
} from '../src/modules/sales/domain/services/pasarela-pago.service';

const ADMIN_CREDENTIALS = { identificador: 'admin', password: 'admin123' };

// `ventas` gestiona los pedidos; `inventario` es un rol sin acceso.
const TEST_USERS = {
  ventas: {
    identificador: 'e2e-ventas-pedidos',
    password: 'VentasE2e123',
    email: 'e2e-ventas-pedidos@francos.test',
    documento: '99999981',
    rol: 'ventas',
  },
  inventario: {
    identificador: 'e2e-inv-pedidos',
    password: 'InvE2e1234',
    email: 'e2e-inv-pedidos@francos.test',
    documento: '99999982',
    rol: 'inventario',
  },
} as const;

// Cliente al que se le registran los pedidos de este archivo.
const CLIENTE = {
  documento: '99999983',
  email: 'e2e-cliente-pedidos@francos.test',
  identificador: 'e2e-cliente-pedidos',
};

// Marcas para reconocer (y borrar) solo los datos que crea este archivo.
const CATEGORIA_NOMBRE = 'E2E Categoría Pedidos OFT0-251';
const PRESENTACION_DESCRIPCION = 'E2E Pedidos OFT0-251';
const PRODUCTO_NOMBRE = 'E2E Producto Pedidos OFT0-251';

const TOKEN_APROBADO = 'tkn_aprobado';
const TOKEN_RECHAZADO = 'tkn_rechazado';

// Doble de Culqi: en CI no hay llave real, y el e2e no debe cobrar de verdad.
class FakePasarelaPago implements PasarelaPagoService {
  private cargos = 0;

  cobrar(params: CobroParams): Promise<CobroResultado> {
    if (params.token === TOKEN_RECHAZADO) {
      return Promise.resolve({
        aprobado: false,
        mensaje: 'Tu tarjeta no tiene fondos suficientes.',
      });
    }

    this.cargos += 1;
    return Promise.resolve({
      aprobado: true,
      numero_operacion: `chr_e2e_${Date.now()}_${this.cargos}`,
      fecha: new Date(),
    });
  }
}

interface PedidoResumenBody {
  id: number;
  codigo: string;
  cliente: { id: string; nombre: string };
  metodo_pago: string;
  total: number;
  tipo_entrega: string;
  estado: string;
  origen: string;
  created_at: string;
}

interface PedidoDetalleBody extends Omit<PedidoResumenBody, 'metodo_pago'> {
  direccion_entrega: string | null;
  items: {
    producto_presentacion_id: number;
    sku: string;
    producto: string;
    presentacion: string;
    cantidad: number;
    precio_unitario: number;
    precio_aplicado: number;
    subtotal: number;
  }[];
  pago: {
    metodo_pago: string;
    monto: number;
    numero_operacion: string | null;
    fecha_pago: string;
    comprobante: null;
  } | null;
}

interface ListadoBody {
  data: PedidoResumenBody[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

describe('Pedidos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  let ventasToken: string;
  let inventarioToken: string;
  let clienteId: string;
  let presentacionMayoristaId: number;
  let presentacionSimpleId: number;
  let presentacionInactivaId: number;
  let pedidoEfectivoId: number;
  let pedidoCulqiId: number;

  const hoy = fechaHoy();

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
        prisma.refreshToken.deleteMany({ where: { user_id: user.id } }),
        prisma.usuarioRol.deleteMany({ where: { user_id: user.id } }),
        prisma.user.delete({ where: { id: user.id } }),
      ]);
    }

    await prisma.persona.deleteMany({ where: { numero_documento: documento } });
  };

  // Borra en orden de dependencia: pago y detalle -> pedido -> cliente y
  // usuarios -> catálogo.
  const deleteTestData = async () => {
    const pedidos = await prisma.pedido.findMany({
      where: {
        OR: [
          { cliente: { persona: { numero_documento: CLIENTE.documento } } },
          {
            user: {
              username: {
                in: Object.values(TEST_USERS).map((u) => u.identificador),
              },
            },
          },
        ],
      },
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

    await deleteUserByDocumento(
      CLIENTE.documento,
      CLIENTE.identificador,
      CLIENTE.email,
    );
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
        apellido_materno: 'Pedidos E2E',
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

  // 30 bolsas de la mayorista (supera el umbral de 24) + 4 de la simple:
  // 30 x 4.20 + 4 x 9.90 = 126.00 + 39.60 = 165.60.
  const pedidoPayload = (overrides: Record<string, unknown> = {}) => ({
    cliente_id: clienteId,
    items: [
      { producto_presentacion_id: presentacionMayoristaId, cantidad: 30 },
      { producto_presentacion_id: presentacionSimpleId, cantidad: 4 },
    ],
    tipo_entrega: 'delivery',
    direccion_entrega: 'Av. La Marina 1450, San Miguel',
    metodo_pago: 'efectivo',
    ...overrides,
  });

  const crearPedido = (payload: Record<string, unknown>, token = ventasToken) =>
    request(app.getHttpServer())
      .post('/api/v1/pedidos')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

  const listar = (
    query: Record<string, string | number>,
    token = ventasToken,
  ) =>
    request(app.getHttpServer())
      .get('/api/v1/pedidos')
      .query(query)
      .set('Authorization', `Bearer ${token}`);

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

    // Catálogo: una presentación con precio mayorista, una sin él y una inactiva.
    const categoria = await prisma.categoria.create({
      data: { nombre: CATEGORIA_NOMBRE },
    });
    const presentaciones = await Promise.all(
      [7781, 7782, 7783].map((cantidad) =>
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
    const crearPresentacion = (
      presentacionId: number,
      data: {
        precio_unitario: number;
        precio_mayorista?: number;
        umbral_mayorista?: number;
        estado?: boolean;
      },
    ) =>
      prisma.productoPresentacion.create({
        data: {
          sku: `FR-P${producto.id}-PR${presentacionId}`,
          producto_id: producto.id,
          presentacion_id: presentacionId,
          ...data,
        },
      });

    presentacionMayoristaId = (
      await crearPresentacion(presentaciones[0].id, {
        precio_unitario: 5.5,
        precio_mayorista: 4.2,
        umbral_mayorista: 24,
      })
    ).id;
    presentacionSimpleId = (
      await crearPresentacion(presentaciones[1].id, { precio_unitario: 9.9 })
    ).id;
    presentacionInactivaId = (
      await crearPresentacion(presentaciones[2].id, {
        precio_unitario: 6.9,
        estado: false,
      })
    ).id;

    // Cliente con usuario: Culqi necesita su correo.
    const personaCliente = await prisma.persona.create({
      data: {
        nombres: 'Rosa Elena',
        apellido_paterno: 'Quispe',
        apellido_materno: 'Huamán',
        tipo_documento: 'dni',
        numero_documento: CLIENTE.documento,
      },
    });
    await prisma.user.create({
      data: {
        persona_id: personaCliente.id,
        email: CLIENTE.email,
        username: CLIENTE.identificador,
        contrasena: await hashPassword('ClienteE2e1'),
        email_verificado: true,
      },
    });
    clienteId = (
      await prisma.cliente.create({
        data: {
          persona_id: personaCliente.id,
          tipo_cliente: 'persona_natural',
          categoria_cliente: 'minorista',
        },
      })
    ).id;

    await createTestUser(TEST_USERS.ventas);
    await createTestUser(TEST_USERS.inventario);

    ventasToken = await login(TEST_USERS.ventas);
    inventarioToken = await login(TEST_USERS.inventario);
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
    it('POST /api/v1/pedidos sin token devuelve 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/pedidos')
        .send(pedidoPayload())
        .expect(401);
    });

    it('GET /api/v1/pedidos sin token devuelve 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/pedidos').expect(401);
    });

    it('GET /api/v1/pedidos/:id sin token devuelve 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/pedidos/1').expect(401);
    });

    it('POST /api/v1/pedidos con rol inventario devuelve 403', async () => {
      await crearPedido(pedidoPayload(), inventarioToken).expect(403);
    });

    it('GET /api/v1/pedidos con rol inventario devuelve 403', async () => {
      await listar({}, inventarioToken).expect(403);
    });

    it('GET /api/v1/pedidos/:id con rol inventario devuelve 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/pedidos/1')
        .set('Authorization', `Bearer ${inventarioToken}`)
        .expect(403);
    });
  });

  describe('registrar (RF-A032 a RF-A035)', () => {
    it('en efectivo devuelve 201 con código, precios mayoristas y total calculados', async () => {
      const response = await crearPedido(pedidoPayload()).expect(201);
      const body = response.body as unknown as PedidoDetalleBody;
      pedidoEfectivoId = body.id;

      expect(body.codigo).toBe(`PED-${String(body.id).padStart(6, '0')}`);
      expect(body).toMatchObject({
        cliente: { id: clienteId, nombre: 'Rosa Elena Quispe Huamán' },
        origen: 'manual',
        estado: 'confirmado',
        tipo_entrega: 'delivery',
        direccion_entrega: 'Av. La Marina 1450, San Miguel',
        total: 165.6,
      });
      expect(body.items).toEqual([
        expect.objectContaining({
          producto_presentacion_id: presentacionMayoristaId,
          producto: PRODUCTO_NOMBRE,
          presentacion: '7781 gr',
          cantidad: 30,
          precio_unitario: 5.5,
          precio_aplicado: 4.2,
          subtotal: 126,
        }),
        expect.objectContaining({
          producto_presentacion_id: presentacionSimpleId,
          cantidad: 4,
          precio_unitario: 9.9,
          precio_aplicado: 9.9,
          subtotal: 39.6,
        }),
      ]);
      expect(body.pago).toMatchObject({
        metodo_pago: 'efectivo',
        monto: 165.6,
        numero_operacion: null,
        comprobante: null,
      });

      // Queda registrado quién lo creó.
      const guardado = await prisma.pedido.findUniqueOrThrow({
        where: { id: body.id },
        select: { user: { select: { username: true } } },
      });
      expect(guardado.user?.username).toBe(TEST_USERS.ventas.identificador);
    });

    it('con Culqi aprobado devuelve 201 con el número de operación del cargo', async () => {
      const response = await crearPedido(
        pedidoPayload({
          tipo_entrega: 'recojo_tienda',
          direccion_entrega: undefined,
          metodo_pago: 'culqi',
          culqi_token: TOKEN_APROBADO,
        }),
      ).expect(201);
      const body = response.body as unknown as PedidoDetalleBody;
      pedidoCulqiId = body.id;

      expect(body.tipo_entrega).toBe('recojo_tienda');
      expect(body.direccion_entrega).toBeNull();
      expect(body.pago?.metodo_pago).toBe('culqi');
      expect(body.pago?.numero_operacion).toMatch(/^chr_e2e_/);
      expect(body.id).toBeGreaterThan(pedidoEfectivoId);
    });

    it('con Culqi rechazado devuelve 402 y no registra el pedido', async () => {
      const antes = await prisma.pedido.count({
        where: { cliente_id: clienteId },
      });

      const response = await crearPedido(
        pedidoPayload({ metodo_pago: 'culqi', culqi_token: TOKEN_RECHAZADO }),
      ).expect(402);

      expect((response.body as { message: string }).message).toBe(
        'Tu tarjeta no tiene fondos suficientes.',
      );
      await expect(
        prisma.pedido.count({ where: { cliente_id: clienteId } }),
      ).resolves.toBe(antes);
    });

    it('delivery sin dirección devuelve 400', async () => {
      await crearPedido(pedidoPayload({ direccion_entrega: '  ' })).expect(400);
    });

    it('Culqi sin token devuelve 400', async () => {
      await crearPedido(pedidoPayload({ metodo_pago: 'culqi' })).expect(400);
    });

    it('sin productos devuelve 400', async () => {
      await crearPedido(pedidoPayload({ items: [] })).expect(400);
    });

    it('con una presentación repetida devuelve 400', async () => {
      await crearPedido(
        pedidoPayload({
          items: [
            { producto_presentacion_id: presentacionSimpleId, cantidad: 1 },
            { producto_presentacion_id: presentacionSimpleId, cantidad: 2 },
          ],
        }),
      ).expect(400);
    });

    it('con un método de pago no permitido devuelve 400', async () => {
      await crearPedido(pedidoPayload({ metodo_pago: 'yape' })).expect(400);
    });

    it('con una presentación desactivada devuelve 409', async () => {
      await crearPedido(
        pedidoPayload({
          items: [
            { producto_presentacion_id: presentacionInactivaId, cantidad: 1 },
          ],
        }),
      ).expect(409);
    });

    it('con un cliente que no existe devuelve 404', async () => {
      await crearPedido(
        pedidoPayload({ cliente_id: '00000000-0000-4000-8000-000000000000' }),
      ).expect(404);
    });
  });

  describe('listar (RF-A030 y RF-A037)', () => {
    it('devuelve los pedidos en orden de llegada con sus campos', async () => {
      const response = await listar({
        origen: 'manual',
        fecha_desde: hoy,
        fecha_hasta: hoy,
        limit: 100,
      }).expect(200);
      const body = response.body as unknown as ListadoBody;

      const propios = body.data.filter((p) =>
        [pedidoEfectivoId, pedidoCulqiId].includes(p.id),
      );
      expect(propios.map((p) => p.id)).toEqual([
        pedidoEfectivoId,
        pedidoCulqiId,
      ]);
      expect(propios[0]).toMatchObject({
        cliente: { id: clienteId, nombre: 'Rosa Elena Quispe Huamán' },
        metodo_pago: 'efectivo',
        total: 165.6,
        tipo_entrega: 'delivery',
        estado: 'confirmado',
        origen: 'manual',
      });
      expect(propios[1].metodo_pago).toBe('culqi');

      const ids = body.data.map((p) => p.id);
      expect(ids).toEqual([...ids].sort((a, b) => a - b));
    });

    it('filtra por estado', async () => {
      const response = await listar({ estado: 'entregado', limit: 100 }).expect(
        200,
      );
      const body = response.body as unknown as ListadoBody;

      expect(body.data.every((p) => p.estado === 'entregado')).toBe(true);
      expect(body.data.map((p) => p.id)).not.toContain(pedidoEfectivoId);
    });

    it('filtra por origen', async () => {
      const response = await listar({ origen: 'portal', limit: 100 }).expect(
        200,
      );
      const body = response.body as unknown as ListadoBody;

      expect(body.data.every((p) => p.origen === 'portal')).toBe(true);
      expect(body.data.map((p) => p.id)).not.toContain(pedidoEfectivoId);
    });

    it('filtra por cliente y no mezcla pedidos de otros clientes', async () => {
      const response = await listar({
        cliente_id: clienteId,
        limit: 100,
      }).expect(200);
      const body = response.body as unknown as ListadoBody;

      expect(body.data.every((p) => p.cliente.id === clienteId)).toBe(true);
      expect(body.data.map((p) => p.id)).toEqual(
        expect.arrayContaining([pedidoEfectivoId, pedidoCulqiId]),
      );
    });

    it('con un cliente sin pedidos devuelve una lista vacía', async () => {
      const response = await listar({
        cliente_id: 'a1b2c3d4-0000-4000-8000-000000000001',
      }).expect(200);
      const body = response.body as unknown as ListadoBody;

      expect(body.data).toEqual([]);
      expect(body.meta.total).toBe(0);
    });

    it('con un cliente_id mal formado devuelve 400', async () => {
      await listar({ cliente_id: 'no-es-un-uuid' }).expect(400);
    });

    it('excluye los pedidos fuera del rango de fechas', async () => {
      const response = await listar({
        fecha_desde: '2000-01-01',
        fecha_hasta: '2000-01-31',
      }).expect(200);

      expect((response.body as unknown as ListadoBody).data).toEqual([]);
    });

    it('con un rango invertido devuelve 400', async () => {
      await listar({
        fecha_desde: '2026-10-31',
        fecha_hasta: '2026-10-01',
      }).expect(400);
    });

    it('con un estado que no existe devuelve 400', async () => {
      await listar({ estado: 'completado' }).expect(400);
    });
  });

  describe('detalle (RF-A031)', () => {
    it('devuelve los productos y la información del pago', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/pedidos/${pedidoCulqiId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(200);
      const body = response.body as unknown as PedidoDetalleBody;

      expect(body.id).toBe(pedidoCulqiId);
      expect(body.items).toHaveLength(2);
      expect(body.total).toBe(165.6);
      expect(body.pago).toMatchObject({
        metodo_pago: 'culqi',
        monto: 165.6,
        comprobante: null,
      });
      expect(body.pago?.fecha_pago).toEqual(expect.any(String));
    });

    it('con un pedido que no existe devuelve 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/pedidos/999999999')
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(404);
    });
  });

  describe('actualizar estado (HU-A-010, RF-A038)', () => {
    const cambiarEstado = (
      id: number,
      estado: string,
      token: string | null = ventasToken,
    ) => {
      const req = request(app.getHttpServer())
        .patch(`/api/v1/pedidos/${id}/estado`)
        .send({ estado });
      return token ? req.set('Authorization', `Bearer ${token}`) : req;
    };

    it('sin token devuelve 401', async () => {
      await cambiarEstado(
        pedidoEfectivoId,
        'en_espera_inventario',
        null,
      ).expect(401);
    });

    it('con rol inventario devuelve 403', async () => {
      await cambiarEstado(
        pedidoEfectivoId,
        'en_espera_inventario',
        inventarioToken,
      ).expect(403);
    });

    it('con un estado que no existe devuelve 400', async () => {
      await cambiarEstado(pedidoEfectivoId, 'completado').expect(400);
    });

    it('no deja a ventas saltar a otro estado (RN6): 409', async () => {
      await cambiarEstado(pedidoEfectivoId, 'entregado').expect(409);
    });

    it('con rol ventas pasa el pedido confirmado a en espera de inventario y lo guarda', async () => {
      const response = await cambiarEstado(
        pedidoEfectivoId,
        'en_espera_inventario',
      ).expect(200);
      const body = response.body as unknown as PedidoDetalleBody;

      expect(body).toMatchObject({
        id: pedidoEfectivoId,
        estado: 'en_espera_inventario',
      });
      await expect(
        prisma.pedido.findUniqueOrThrow({
          where: { id: pedidoEfectivoId },
          select: { estado: true },
        }),
      ).resolves.toEqual({ estado: 'en_espera_inventario' });
    });

    it('aparece al filtrar por en espera de inventario', async () => {
      const response = await listar({
        estado: 'en_espera_inventario',
        limit: 100,
      }).expect(200);

      expect(
        (response.body as unknown as ListadoBody).data.map((p) => p.id),
      ).toContain(pedidoEfectivoId);
    });

    it('no lo vuelve a enviar si ya está en espera de inventario: 409', async () => {
      await cambiarEstado(pedidoEfectivoId, 'en_espera_inventario').expect(409);
    });

    it('con un pedido que no existe devuelve 404', async () => {
      await cambiarEstado(999999999, 'en_espera_inventario').expect(404);
    });
  });
});
