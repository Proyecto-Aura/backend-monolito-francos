import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { EstadoPedido } from '../src/modules/sales/domain/enums';

const MARCA = 'E2E260';
const URL = '/api/v1/inventario/pedidos';
const ROLES = [
  'admin',
  'inventario',
  'ventas',
  'despacho',
  'produccion',
  'cliente',
] as const;
type Rol = (typeof ROLES)[number];
type Accion = 'en-preparacion' | 'pendiente-entrega';
interface PedidoHttp {
  id: number;
  codigo: string;
  estado: string;
  cliente: { id: string; nombre: string };
  productos: number;
  unidades: number;
  items: {
    producto_presentacion_id: number;
    cantidad: number;
    producto: string;
    sku: string;
  }[];
  pago: { metodo_pago: string; monto: number } | null;
}
interface ListaHttp {
  data: PedidoHttp[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}
const ESTADOS = [
  EstadoPedido.EN_ESPERA_INVENTARIO,
  EstadoPedido.EN_PREPARACION,
  EstadoPedido.PENDIENTE_ENTREGA,
];

describe('Inventario - pedidos por preparar OFT0-260 (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let clienteId: string;
  const presentaciones: number[] = [];
  const productosTerminados: number[] = [];
  const fixtures = {} as Record<EstadoPedido, number>;
  const tokens = {} as Record<Rol, string>;
  let secuencia = 0;
  const http = () => request(app.getHttpServer());
  const auth = (rol: Rol = 'inventario') => ({
    Authorization: `Bearer ${tokens[rol]}`,
  });
  const listar = async (query: Record<string, string | number> = {}) => {
    const res = await http().get(URL).set(auth()).query(query).expect(200);
    return res.body as ListaHttp;
  };
  const itemsPreparados = () =>
    presentaciones.map((producto_presentacion_id, i) => ({
      producto_presentacion_id,
      cantidad_preparada: i === 0 ? 3 : 5,
    }));
  const patch = (
    id: number | string,
    accion: Accion,
    rol: Rol = 'inventario',
    items = itemsPreparados(),
  ) => {
    const req = http().patch(`${URL}/${id}/${accion}`).set(auth(rol));
    return accion === 'pendiente-entrega' ? req.send({ items }) : req;
  };
  const snapshotStock = async () => ({
    productos: await prisma.productoTerminado.findMany({
      where: { producto_presentacion_id: { in: presentaciones } },
      orderBy: { id: 'asc' },
    }),
    lotes: await prisma.loteProductoTerminado.findMany({
      where: { producto_terminado_id: { in: productosTerminados } },
      orderBy: { id: 'asc' },
    }),
    movimientos: await prisma.movimientoProductoTerminado.findMany({
      where: {
        lote_producto_terminado: {
          producto_terminado_id: { in: productosTerminados },
        },
      },
      orderBy: { id: 'asc' },
    }),
  });
  const estadoDe = async (id: number) =>
    (await prisma.pedido.findUniqueOrThrow({ where: { id } })).estado;
  const sembrar = (
    estado: EstadoPedido,
    created_at = new Date('2026-10-31T12:00:00Z'),
    tag = 'P',
  ) =>
    prisma.pedido.create({
      data: {
        codigo: `${MARCA}-${tag}-${++secuencia}`,
        cliente_id: clienteId,
        origen: 'manual',
        estado,
        tipo_entrega: 'delivery',
        direccion_entrega: 'Lima E2E',
        total: 80,
        created_at,
        detalles: {
          create: presentaciones.map((producto_presentacion_id, i) => ({
            producto_presentacion_id,
            cantidad: i === 0 ? 3 : 5,
            precio_unitario: 10,
            precio_aplicado: 10,
            subtotal: i === 0 ? 30 : 50,
          })),
        },
        pago: {
          create: {
            metodo_pago: 'efectivo',
            monto: 80,
            fecha_pago: created_at,
          },
        },
      },
    });

  const limpiar = async () => {
    const pedidos = await prisma.pedido.findMany({
      where: { codigo: { startsWith: MARCA } },
      select: { id: true },
    });
    const ids = pedidos.map((p) => p.id);
    await prisma.pago.deleteMany({ where: { pedido_id: { in: ids } } });
    await prisma.detallePedido.deleteMany({
      where: { pedido_id: { in: ids } },
    });
    await prisma.pedido.deleteMany({ where: { id: { in: ids } } });
    await prisma.cliente.deleteMany({
      where: { persona: { numero_documento: '99260009' } },
    });
    await prisma.persona.deleteMany({
      where: { numero_documento: '99260009' },
    });
    for (const rol of ROLES) {
      const user = await prisma.user.findUnique({
        where: { username: `e2e-oft260-${rol}` },
      });
      if (!user) continue;
      await prisma.refreshToken.deleteMany({ where: { user_id: user.id } });
      await prisma.usuarioRol.deleteMany({ where: { user_id: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.persona.delete({ where: { id: user.persona_id } });
    }
    const filtroStock = {
      producto_terminado: {
        producto_presentacion: { producto: { nombre: MARCA } },
      },
    };
    await prisma.movimientoProductoTerminado.deleteMany({
      where: { lote_producto_terminado: filtroStock },
    });
    await prisma.loteProductoTerminado.deleteMany({ where: filtroStock });
    await prisma.productoTerminado.deleteMany({
      where: { producto_presentacion: { producto: { nombre: MARCA } } },
    });
    await prisma.productoPresentacion.deleteMany({
      where: { producto: { nombre: MARCA } },
    });
    await prisma.producto.deleteMany({ where: { nombre: MARCA } });
    await prisma.presentacion.deleteMany({ where: { descripcion: MARCA } });
    await prisma.categoria.deleteMany({ where: { nombre: MARCA } });
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await limpiar();
    // Credencial ficticia usada solo por los usuarios desechables de esta suite.
    const password = 'Test260!';
    const contrasena = await hashPassword(password);
    for (const [i, rol] of ROLES.entries()) {
      const persona = await prisma.persona.create({
        data: {
          nombres: MARCA,
          apellido_paterno: rol,
          apellido_materno: 'Prueba',
          tipo_documento: 'dni',
          numero_documento: `9926000${i}`,
        },
      });
      const user = await prisma.user.create({
        data: {
          persona_id: persona.id,
          username: `e2e-oft260-${rol}`,
          email: `e2e-oft260-${rol}@francos.test`,
          contrasena,
          estado: true,
          email_verificado: true,
        },
      });
      const rolDb = await prisma.rol.findUniqueOrThrow({
        where: { nombre: rol },
      });
      await prisma.usuarioRol.create({
        data: { user_id: user.id, rol_id: rolDb.id, estado: true },
      });
      const login = await http()
        .post('/api/v1/auth/login')
        .send({ identificador: user.username, password })
        .expect(201);
      tokens[rol] = (login.body as { access_token: string }).access_token;
    }
    const persona = await prisma.persona.create({
      data: {
        nombres: `${MARCA} Cliente`,
        apellido_paterno: 'Comprador',
        apellido_materno: 'Prueba',
        tipo_documento: 'dni',
        numero_documento: '99260009',
      },
    });
    const cliente = await prisma.cliente.create({
      data: {
        persona_id: persona.id,
        tipo_cliente: 'persona_natural',
        categoria_cliente: 'minorista',
        razon_social: `${MARCA} Empresa`,
      },
    });
    clienteId = cliente.id;
    const categoria = await prisma.categoria.create({
      data: { nombre: MARCA },
    });
    const producto = await prisma.producto.create({
      data: { nombre: MARCA, categoria_id: categoria.id },
    });
    for (let i = 0; i < 2; i++) {
      const presentacion = await prisma.presentacion.create({
        data: { cantidad: 26010 + i, unidad_medida: 'gr', descripcion: MARCA },
      });
      const pp = await prisma.productoPresentacion.create({
        data: {
          producto_id: producto.id,
          presentacion_id: presentacion.id,
          sku: `${MARCA}-${i}`,
          precio_unitario: 10,
        },
      });
      const terminado = await prisma.productoTerminado.create({
        data: { producto_presentacion_id: pp.id },
      });
      presentaciones.push(pp.id);
      productosTerminados.push(terminado.id);
      await prisma.loteProductoTerminado.create({
        data: {
          producto_terminado_id: terminado.id,
          codigo_lote: `${MARCA}-lote-${i}`,
          fecha_produccion: new Date(),
          fecha_vencimiento: null,
          cantidad_inicial: 1000,
          cantidad_actual: 1000,
        },
      });
    }
    for (const estado of Object.values(EstadoPedido))
      fixtures[estado] = (await sembrar(estado)).id;
  }, 60000);

  afterAll(async () => {
    try {
      if (prisma) await limpiar();
    } finally {
      if (app) await app.close();
    }
  }, 60000);

  const rutas = [
    { metodo: 'get', ruta: '' },
    { metodo: 'get', ruta: '/indicadores' },
    { metodo: 'get', ruta: '/1' },
    { metodo: 'patch', ruta: '/1/en-preparacion' },
    { metodo: 'patch', ruta: '/1/pendiente-entrega' },
  ] as const;
  it.each(rutas)('$metodo $ruta exige token', async ({ metodo, ruta }) => {
    await http()[metodo](`${URL}${ruta}`).expect(401);
  });

  it.each(['ventas', 'despacho', 'produccion', 'cliente'] as const)(
    '%s no puede consultar ni avanzar pedidos de inventario',
    async (rol) => {
      const id = fixtures.en_espera_inventario;
      for (const { metodo, ruta } of rutas) {
        await http()
          [metodo](`${URL}${ruta.replace('/1', `/${id}`)}`)
          .set(auth(rol))
          .expect(403);
      }
      expect(await estadoDe(id)).toBe('en_espera_inventario');
    },
  );

  it('el listado incluye solo sus tres estados, cliente, productos y unidades', async () => {
    const lista = await listar({ search: MARCA, limit: 100 });
    expect(lista.meta).toEqual({
      total: 3,
      page: 1,
      limit: 100,
      total_pages: 1,
    });
    expect(lista.data.map((p) => p.id)).toEqual(
      ESTADOS.map((estado) => fixtures[estado]),
    );
    for (const fila of lista.data) {
      expect(fila).toMatchObject({
        cliente: { id: clienteId, nombre: `${MARCA} Empresa` },
        productos: 2,
        unidades: 8,
        metodo_pago: 'efectivo',
        total: 80,
      });
    }
    const primera = await listar({ search: MARCA, page: 1, limit: 2 });
    const segunda = await listar({ search: MARCA, page: 2, limit: 2 });
    expect(primera.meta.total_pages).toBe(2);
    expect(
      new Set([...primera.data, ...segunda.data].map((p) => p.id)),
    ).toEqual(new Set(ESTADOS.map((estado) => fixtures[estado])));
  });

  it.each(ESTADOS)(
    'filtra por estado %s sin ampliar el alcance',
    async (estado) => {
      const lista = await listar({ search: MARCA, estado });
      expect(lista.data.map((p) => p.id)).toEqual([fixtures[estado]]);
    },
  );

  it('busca por código, nombre y razón social sin traer estados ajenos', async () => {
    const pedido = await prisma.pedido.findUniqueOrThrow({
      where: { id: fixtures.en_preparacion },
    });
    expect(
      (await listar({ search: pedido.codigo.toLowerCase() })).data.map(
        (p) => p.id,
      ),
    ).toEqual([pedido.id]);
    for (const search of [`${MARCA} cliente`, `${MARCA} empresa`]) {
      const lista = await listar({ search });
      expect(lista.data.map((p) => p.id)).toEqual(
        ESTADOS.map((estado) => fixtures[estado]),
      );
    }
    expect(await listar({ search: `${MARCA}-inexistente` })).toEqual({
      data: [],
      meta: { total: 0, page: 1, limit: 10, total_pages: 0 },
    });
  });

  it.each(ESTADOS)(
    'muestra detalle y pago del pedido en %s',
    async (estado) => {
      const res = await http()
        .get(`${URL}/${fixtures[estado]}`)
        .set(auth())
        .expect(200);
      const body = res.body as PedidoHttp;
      expect(body).toMatchObject({
        id: fixtures[estado],
        estado,
        cliente: { id: clienteId, nombre: `${MARCA} Empresa` },
        pago: { metodo_pago: 'efectivo', monto: 80 },
      });
      expect(body.items).toHaveLength(2);
      for (const [i, producto_presentacion_id] of presentaciones.entries()) {
        expect(body.items[i]).toMatchObject({
          producto_presentacion_id,
          cantidad: i === 0 ? 3 : 5,
          producto: MARCA,
          sku: `${MARCA}-${i}`,
        });
      }
    },
  );

  it.each(
    Object.values(EstadoPedido).filter((estado) => !ESTADOS.includes(estado)),
  )('GET oculta pedidos en %s con 404', async (estado) => {
    await http().get(`${URL}/${fixtures[estado]}`).set(auth()).expect(404);
  });

  it('indicadores devuelve conteos exactos de los tres estados y no cae en /:id', async () => {
    const res = await http().get(`${URL}/indicadores`).set(auth()).expect(200);
    const conteos = await Promise.all(
      ESTADOS.map((estado) => prisma.pedido.count({ where: { estado } })),
    );
    expect(res.body).toEqual({
      en_espera_inventario: conteos[0],
      en_preparacion: conteos[1],
      pendiente_entrega: conteos[2],
    });
  });

  it.each(['admin', 'inventario'] as const)(
    '%s consulta y completa el flujo hasta pendiente_entrega',
    async (rol) => {
      const pedido = await sembrar(EstadoPedido.EN_ESPERA_INVENTARIO);
      await http().get(URL).set(auth(rol)).expect(200);
      await http().get(`${URL}/indicadores`).set(auth(rol)).expect(200);
      await http().get(`${URL}/${pedido.id}`).set(auth(rol)).expect(200);
      const antes = await prisma.productoTerminado.findMany({
        where: { producto_presentacion_id: { in: presentaciones } },
        orderBy: { id: 'asc' },
      });
      const preparando = await patch(pedido.id, 'en-preparacion', rol).expect(
        200,
      );
      expect(preparando.body).toMatchObject({
        id: pedido.id,
        estado: 'en_preparacion',
      });
      expect(
        await prisma.productoTerminado.findMany({
          where: { producto_presentacion_id: { in: presentaciones } },
          orderBy: { id: 'asc' },
        }),
      ).toEqual(antes);
      const listo = await patch(pedido.id, 'pendiente-entrega', rol).expect(
        200,
      );
      expect(listo.body).toMatchObject({
        id: pedido.id,
        estado: 'pendiente_entrega',
      });
      expect((listo.body as PedidoHttp).items).toHaveLength(2);
      expect(await estadoDe(pedido.id)).toBe('pendiente_entrega');
      const despacho = await http()
        .get(`/api/v1/despacho/pedidos/${pedido.id}`)
        .set(auth('admin'))
        .expect(200);
      expect(despacho.body).toMatchObject({
        id: pedido.id,
        estado: 'pendiente_entrega',
      });
      const despues = await prisma.productoTerminado.findMany({
        where: { producto_presentacion_id: { in: presentaciones } },
        orderBy: { id: 'asc' },
      });
      expect(despues.map((p) => p.stock_actual.toNumber())).toEqual(
        antes.map((p, i) => p.stock_actual.toNumber() - (i === 0 ? 3 : 5)),
      );
    },
  );

  it.each(
    Object.values(EstadoPedido).flatMap((estado) => [
      {
        estado,
        accion: 'en-preparacion' as const,
        desde: EstadoPedido.EN_ESPERA_INVENTARIO,
        hasta: EstadoPedido.EN_PREPARACION,
      },
      {
        estado,
        accion: 'pendiente-entrega' as const,
        desde: EstadoPedido.EN_PREPARACION,
        hasta: EstadoPedido.PENDIENTE_ENTREGA,
      },
    ]),
  )(
    '$accion desde $estado respeta la transición permitida',
    async ({ estado, accion, desde, hasta }) => {
      const pedido = await sembrar(estado);
      await patch(pedido.id, accion).expect(estado === desde ? 200 : 409);
      expect(await estadoDe(pedido.id)).toBe(estado === desde ? hasta : estado);
    },
  );

  it('dos peticiones simultáneas solo permiten una preparación', async () => {
    const pedido = await sembrar(EstadoPedido.EN_ESPERA_INVENTARIO);
    const respuestas = await Promise.all([
      patch(pedido.id, 'en-preparacion'),
      patch(pedido.id, 'en-preparacion'),
    ]);
    expect(respuestas.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await estadoDe(pedido.id)).toBe('en_preparacion');
  });

  it('los indicadores reflejan las dos transiciones', async () => {
    const pedido = await sembrar(EstadoPedido.EN_ESPERA_INVENTARIO);
    const antes = (
      await http().get(`${URL}/indicadores`).set(auth()).expect(200)
    ).body as Record<string, number>;
    await patch(pedido.id, 'en-preparacion').expect(200);
    expect(
      (await http().get(`${URL}/indicadores`).set(auth()).expect(200)).body,
    ).toEqual({
      en_espera_inventario: antes['en_espera_inventario'] - 1,
      en_preparacion: antes['en_preparacion'] + 1,
      pendiente_entrega: antes['pendiente_entrega'],
    });
    await patch(pedido.id, 'pendiente-entrega').expect(200);
    expect(
      (await http().get(`${URL}/indicadores`).set(auth()).expect(200)).body,
    ).toEqual({
      en_espera_inventario: antes['en_espera_inventario'] - 1,
      en_preparacion: antes['en_preparacion'],
      pendiente_entrega: antes['pendiente_entrega'] + 1,
    });
  });

  it('usa cantidades preparadas distintas a las pedidas y registra salidas con su razón', async () => {
    const pedido = await sembrar(EstadoPedido.EN_PREPARACION);
    const antes = await snapshotStock();
    const items = itemsPreparados()
      .map((item, i) => ({ ...item, cantidad_preparada: i === 0 ? 7 : 9 }))
      .reverse();
    await patch(pedido.id, 'pendiente-entrega', 'inventario', items).expect(
      200,
    );
    const despues = await snapshotStock();
    expect(despues.productos.map((p) => p.stock_actual.toNumber())).toEqual(
      antes.productos.map(
        (p, i) => p.stock_actual.toNumber() - (i === 0 ? 7 : 9),
      ),
    );
    const movimientos = await prisma.movimientoProductoTerminado.findMany({
      where: { razon: `Salida por preparación de pedido ${pedido.codigo}` },
      include: { lote_producto_terminado: true },
    });
    expect(movimientos).toHaveLength(2);
    for (const [i, producto_terminado_id] of productosTerminados.entries()) {
      const salida = movimientos.find(
        (m) =>
          m.lote_producto_terminado.producto_terminado_id ===
          producto_terminado_id,
      );
      expect(salida?.tipo).toBe('salida');
      expect(salida?.cantidad.toNumber()).toBe(i === 0 ? 7 : 9);
    }
    expect(await estadoDe(pedido.id)).toBe('pendiente_entrega');
    // Reintentar no debe generar otro descuento.
    await patch(pedido.id, 'pendiente-entrega', 'inventario', items).expect(
      409,
    );
    expect(await snapshotStock()).toEqual(despues);
  });

  it.each(['faltante', 'sobrante', 'sustituido', 'duplicado'] as const)(
    'rechaza item %s con 400 sin alterar stock ni estado',
    async (caso) => {
      const pedido = await sembrar(EstadoPedido.EN_PREPARACION);
      const originales = itemsPreparados();
      const extra = {
        producto_presentacion_id: 2147483647,
        cantidad_preparada: 1,
      };
      const items =
        caso === 'faltante'
          ? [originales[0]]
          : caso === 'sobrante'
            ? [...originales, extra]
            : caso === 'sustituido'
              ? [originales[0], extra]
              : [...originales, originales[0]];
      const antes = await snapshotStock();
      await patch(pedido.id, 'pendiente-entrega', 'inventario', items).expect(
        400,
      );
      expect(await estadoDe(pedido.id)).toBe('en_preparacion');
      expect(await snapshotStock()).toEqual(antes);
    },
  );

  it('stock insuficiente en la segunda línea no descuenta la primera ni cambia el estado', async () => {
    const pedido = await sembrar(EstadoPedido.EN_PREPARACION);
    const antes = await snapshotStock();
    const items = itemsPreparados().map((item, i) => ({
      ...item,
      cantidad_preparada:
        i === 0 ? 1 : antes.productos[i].stock_actual.toNumber() + 1,
    }));
    await patch(pedido.id, 'pendiente-entrega', 'inventario', items).expect(
      409,
    );
    expect(await estadoDe(pedido.id)).toBe('en_preparacion');
    expect(await snapshotStock()).toEqual(antes);
  });

  it.each([
    {},
    { items: [] },
    { items: [{ producto_presentacion_id: 1, cantidad_preparada: 0 }] },
    { items: [{ producto_presentacion_id: 1, cantidad_preparada: -1 }] },
    { items: [{ producto_presentacion_id: 1, cantidad_preparada: 1.001 }] },
  ])('valida el body de entrega %j', async (body) => {
    const pedido = await sembrar(EstadoPedido.EN_PREPARACION);
    const antes = await snapshotStock();
    await http()
      .patch(`${URL}/${pedido.id}/pendiente-entrega`)
      .set(auth())
      .send(body)
      .expect(400);
    expect(await estadoDe(pedido.id)).toBe('en_preparacion');
    expect(await snapshotStock()).toEqual(antes);
  });

  it('GET y las dos acciones devuelven 404 para pedidos inexistentes', async () => {
    await http().get(`${URL}/2147483647`).set(auth()).expect(404);
    await patch(2147483647, 'en-preparacion').expect(404);
    await patch(2147483647, 'pendiente-entrega').expect(404);
  });

  it.each(['abc', '1.5'])(
    'valida el identificador %s en detalle y acciones',
    async (id) => {
      await http().get(`${URL}/${id}`).set(auth()).expect(400);
      await patch(id, 'en-preparacion').expect(400);
      await patch(id, 'pendiente-entrega').expect(400);
    },
  );

  it.each([
    { estado: 'confirmado' },
    { estado: 'en_camino' },
    { estado: 'entregado' },
    { estado: 'cancelado' },
    { estado: 'invalido' },
    { page: 0 },
    { limit: 101 },
    { fecha: 'ayer' },
    { fecha: '2026-13-01' },
    { fecha_desde: 'ayer' },
    { fecha_hasta: '2026-13-01' },
    { fecha_desde: '2026-11-02', fecha_hasta: '2026-11-01' },
  ])('rechaza filtros inválidos %j', async (query) => {
    await http().get(URL).set(auth()).query(query).expect(400);
  });

  it('filtra el día de Lima con inicio inclusivo y fin exclusivo', async () => {
    const fechas = [
      '2026-10-31T04:59:59.999Z',
      '2026-10-31T05:00:00.000Z',
      '2026-11-01T04:59:59.999Z',
      '2026-11-01T05:00:00.000Z',
    ];
    const pedidos = [] as number[];
    for (const fecha of fechas)
      pedidos.push(
        (await sembrar(EstadoPedido.EN_PREPARACION, new Date(fecha), 'DIA')).id,
      );
    const lista = await listar({
      search: `${MARCA}-DIA`,
      fecha: '2026-10-31',
      estado: 'en_preparacion',
    });
    expect(lista.data.map((p) => p.id)).toEqual([pedidos[1], pedidos[2]]);
    expect(lista.meta.total).toBe(2);
  });

  it('filtra rangos de Lima, acepta extremos abiertos y prioriza el rango sobre fecha', async () => {
    const fechas = [
      '2026-10-30T04:59:59.999Z',
      '2026-10-30T05:00:00Z',
      '2026-11-02T04:59:59.999Z',
      '2026-11-02T05:00:00Z',
    ];
    const pedidos: number[] = [];
    for (const fecha of fechas)
      pedidos.push(
        (await sembrar(EstadoPedido.EN_PREPARACION, new Date(fecha), 'RAN')).id,
      );
    const base = { search: `${MARCA}-RAN`, estado: 'en_preparacion' };
    const rango = {
      ...base,
      fecha_desde: '2026-10-30',
      fecha_hasta: '2026-11-01',
    };
    expect((await listar(rango)).data.map((p) => p.id)).toEqual([
      pedidos[1],
      pedidos[2],
    ]);
    expect(
      (await listar({ ...rango, fecha: '2025-01-01' })).data.map((p) => p.id),
    ).toEqual([pedidos[1], pedidos[2]]);
    expect(
      (await listar({ ...base, fecha_desde: '2026-10-30' })).data.map(
        (p) => p.id,
      ),
    ).toEqual(pedidos.slice(1));
    expect(
      (await listar({ ...base, fecha_hasta: '2026-11-01' })).data.map(
        (p) => p.id,
      ),
    ).toEqual(pedidos.slice(0, 3));
    // El contrato anterior sigue filtrando un día completo.
    expect(
      (await listar({ ...base, fecha: '2026-10-30' })).data.map((p) => p.id),
    ).toEqual([pedidos[1]]);
    expect(
      (
        await listar({
          ...base,
          fecha_desde: '2026-10-30',
          fecha_hasta: '2026-10-30',
        })
      ).data.map((p) => p.id),
    ).toEqual([pedidos[1]]);
  });
});
