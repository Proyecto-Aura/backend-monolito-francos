import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';

const MARCA = 'E2E-OFT261';
const URL = '/api/v1/solicitudes-produccion';
const ROLES = [
  'admin',
  'inventario',
  'produccion',
  'ventas',
  'cliente',
] as const;
type Rol = (typeof ROLES)[number];
type Estado = 'pendiente' | 'en_proceso' | 'entregado' | 'rechazado';
interface LineaHttp {
  id: number;
  solicitud_produccion_id: number;
  producto_terminado_id: number;
  sku: string;
  producto_nombre: string;
  categoria_nombre: string;
  presentacion_cantidad: number;
  presentacion_unidad_medida: string;
  cantidad_solicitada: number;
  created_at: string;
  updated_at: string;
}
interface SolicitudHttp {
  id: number;
  codigo: string;
  cantidad_productos: number;
  estado: Estado;
  fecha_creacion: string;
  fecha_limite: string | null;
  solicitado_por: string;
  solicitado_por_nombre: string;
  detalle: LineaHttp[];
}
interface ListaHttp {
  data: SolicitudHttp[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

describe('Solicitudes de producción OFT0-261 (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const tokens = {} as Record<Rol, string>;
  const usuarios = {} as Record<Rol, string>;
  const productos: number[] = [];
  let secuencia = 0;
  const auth = (rol: Rol = 'inventario') => ({
    Authorization: `Bearer ${tokens[rol]}`,
  });
  const codigo = () => `${MARCA}-${++secuencia}`;
  const linea = (indice = 0, cantidad = 50) => ({
    producto_terminado_id: productos[indice],
    cantidad_solicitada: cantidad,
  });
  const http = () => request(app.getHttpServer());
  const crear = async (rol: Rol = 'inventario') => {
    const res = await http()
      .post(URL)
      .set(auth(rol))
      .send({ codigo: codigo(), detalle: [linea()] })
      .expect(201);
    return res.body as SolicitudHttp;
  };
  const obtener = async (id: number, rol: Rol = 'inventario') => {
    const res = await http().get(`${URL}/${id}`).set(auth(rol)).expect(200);
    return res.body as SolicitudHttp;
  };
  const listar = async (query: Record<string, string | number>) => {
    const res = await http().get(URL).set(auth()).query(query).expect(200);
    return res.body as ListaHttp;
  };
  const cambiar = (id: number, estado: Estado, rol: Rol = 'produccion') =>
    http().patch(`${URL}/${id}/estado`).set(auth(rol)).send({ estado });
  const fijarEstado = async (estado: Estado) => {
    const solicitud = await crear();
    await prisma.solicitudProduccion.update({
      where: { id: solicitud.id },
      data: { estado },
    });
    return obtener(solicitud.id);
  };

  const limpiar = async () => {
    await prisma.solicitudProduccionDetalle.deleteMany({
      where: { solicitud_produccion: { codigo: { startsWith: MARCA } } },
    });
    await prisma.solicitudProduccion.deleteMany({
      where: { codigo: { startsWith: MARCA } },
    });
    const filtroProducto = {
      producto_presentacion: { producto: { nombre: { startsWith: MARCA } } },
    };
    await prisma.movimientoProductoTerminado.deleteMany({
      where: {
        lote_producto_terminado: { producto_terminado: filtroProducto },
      },
    });
    await prisma.loteProductoTerminado.deleteMany({
      where: { producto_terminado: filtroProducto },
    });
    await prisma.productoTerminado.deleteMany({ where: filtroProducto });
    await prisma.productoPresentacion.deleteMany({
      where: { producto: { nombre: { startsWith: MARCA } } },
    });
    await prisma.producto.deleteMany({
      where: { nombre: { startsWith: MARCA } },
    });
    await prisma.presentacion.deleteMany({
      where: { descripcion: { startsWith: MARCA } },
    });
    await prisma.categoria.deleteMany({
      where: { nombre: { startsWith: MARCA } },
    });
    for (const rol of ROLES) {
      const usuario = await prisma.user.findUnique({
        where: { username: `e2e-oft261-${rol}` },
      });
      if (!usuario) continue;
      await prisma.refreshToken.deleteMany({ where: { user_id: usuario.id } });
      await prisma.usuarioRol.deleteMany({ where: { user_id: usuario.id } });
      await prisma.user.delete({ where: { id: usuario.id } });
      await prisma.persona.delete({ where: { id: usuario.persona_id } });
    }
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
    const password = 'SolicitudE2e261';
    const contrasena = await hashPassword(password);
    for (const [indice, rol] of ROLES.entries()) {
      const persona = await prisma.persona.create({
        data: {
          nombres: 'Solicitud',
          apellido_paterno: rol,
          apellido_materno: MARCA,
          tipo_documento: 'dni',
          numero_documento: `9926100${indice}`,
        },
      });
      const usuario = await prisma.user.create({
        data: {
          persona_id: persona.id,
          username: `e2e-oft261-${rol}`,
          email: `e2e-oft261-${rol}@francos.test`,
          contrasena,
          estado: true,
          email_verificado: true,
        },
      });
      const rolDb = await prisma.rol.findUniqueOrThrow({
        where: { nombre: rol },
      });
      await prisma.usuarioRol.create({
        data: { user_id: usuario.id, rol_id: rolDb.id, estado: true },
      });
      usuarios[rol] = usuario.id;
      const login = await http()
        .post('/api/v1/auth/login')
        .send({ identificador: usuario.username, password })
        .expect(201);
      tokens[rol] = (login.body as { access_token: string }).access_token;
    }
    const categoria = await prisma.categoria.create({
      data: { nombre: `${MARCA} Snacks` },
    });
    for (let i = 0; i < 2; i++) {
      const presentacion = await prisma.presentacion.create({
        data: {
          cantidad: 26100 + i,
          unidad_medida: 'gr',
          descripcion: `${MARCA} presentación ${i}`,
        },
      });
      const res = await http()
        .post('/api/v1/productos')
        .set(auth('admin'))
        .send({
          categoria_id: categoria.id,
          nombre: `${MARCA} Chifles ${i}`,
          destacado: false,
          producto_presentaciones: [
            { presentacion_id: presentacion.id, precio_unitario: 10 },
          ],
        })
        .expect(201);
      const producto = res.body as {
        producto_presentaciones: { id: number }[];
      };
      const terminado = await prisma.productoTerminado.findUniqueOrThrow({
        where: {
          producto_presentacion_id: producto.producto_presentaciones[0].id,
        },
      });
      productos.push(terminado.id);
    }
    await prisma.loteProductoTerminado.create({
      data: {
        producto_terminado_id: productos[0],
        codigo_lote: `${MARCA}-lote`,
        fecha_produccion: new Date('2026-10-01'),
        cantidad_inicial: 25,
        cantidad_actual: 25,
      },
    });
  }, 60000);

  afterAll(async () => {
    try {
      if (prisma) await limpiar();
    } finally {
      if (app) await app.close();
    }
  }, 60000);

  describe('GET /indicadores', () => {
    const ruta = `${URL}/indicadores`;

    it('sin token devuelve 401', async () => {
      await http().get(ruta).expect(401);
    });

    it.each(['ventas', 'cliente'] as const)('%s recibe 403', async (rol) => {
      await http().get(ruta).set(auth(rol)).expect(403);
    });

    it.each(['admin', 'inventario', 'produccion'] as const)(
      '%s puede consultar indicadores sin caer en la ruta /:id',
      async (rol) => {
        const res = await http().get(ruta).set(auth(rol)).expect(200);
        expect(res.body).toEqual({
          pendiente: 0,
          en_proceso: 0,
          entregado: 0,
          rechazado: 0,
          total: 0,
        });
      },
    );

    it('cuenta solicitudes por estado, incluye ceros y suma el total', async () => {
      const solicitudes = [] as SolicitudHttp[];
      try {
        for (const [indice, estado] of (
          ['pendiente', 'en_proceso', 'entregado', 'rechazado'] as const
        ).entries()) {
          for (let i = 0; i <= indice; i++) {
            solicitudes.push(await fijarEstado(estado));
          }
        }
        const res = await http().get(ruta).set(auth()).expect(200);
        expect(res.body).toEqual({
          pendiente: 1,
          en_proceso: 2,
          entregado: 3,
          rechazado: 4,
          total: 10,
        });

        const entregadas = solicitudes.filter((s) => s.estado === 'entregado');
        for (const solicitud of entregadas) {
          await prisma.solicitudProduccion.update({
            where: { id: solicitud.id },
            data: { estado: 'rechazado' },
          });
        }
        const sinEntregadas = await http().get(ruta).set(auth()).expect(200);
        expect(sinEntregadas.body).toEqual({
          pendiente: 1,
          en_proceso: 2,
          entregado: 0,
          rechazado: 7,
          total: 10,
        });
      } finally {
        const ids = solicitudes.map((s) => s.id);
        await prisma.solicitudProduccionDetalle.deleteMany({
          where: { solicitud_produccion_id: { in: ids } },
        });
        await prisma.solicitudProduccion.deleteMany({
          where: { id: { in: ids } },
        });
      }
    });
  });

  describe('PATCH /:id (fecha límite)', () => {
    const body = { fecha_limite: '2026-11-15' };

    it('sin token devuelve 401', async () => {
      await http().patch(`${URL}/1`).send(body).expect(401);
    });

    it.each(['produccion', 'ventas', 'cliente'] as const)(
      '%s recibe 403 sin cambiar la fecha',
      async (rol) => {
        const solicitud = await crear();
        await http()
          .patch(`${URL}/${solicitud.id}`)
          .set(auth(rol))
          .send(body)
          .expect(403);
        expect((await obtener(solicitud.id)).fecha_limite).toBeNull();
      },
    );

    it.each(['admin', 'inventario'] as const)(
      '%s cambia y persiste la fecha límite de una solicitud pendiente',
      async (rol) => {
        const solicitud = await crear();
        const antes = await obtener(solicitud.id);
        for (const fecha_limite of ['2026-11-15', '2026-11-20']) {
          const res = await http()
            .patch(`${URL}/${solicitud.id}`)
            .set(auth(rol))
            .send({ fecha_limite })
            .expect(200);
          expect(res.body).toMatchObject({
            id: solicitud.id,
            estado: 'pendiente',
            fecha_limite: `${fecha_limite}T00:00:00.000Z`,
          });
          const leida = await obtener(solicitud.id);
          expect(leida.fecha_limite).toBe(`${fecha_limite}T00:00:00.000Z`);
          expect(leida.detalle).toEqual(antes.detalle);
        }
      },
    );

    it('devuelve 404 para una solicitud inexistente', async () => {
      await http()
        .patch(`${URL}/2147483647`)
        .set(auth())
        .send(body)
        .expect(404);
    });

    it.each(['en_proceso', 'entregado', 'rechazado'] as const)(
      'devuelve 409 y conserva la fecha y el detalle en estado %s',
      async (estado) => {
        const solicitud = await fijarEstado(estado);
        for (const rol of ['admin', 'inventario'] as const) {
          await http()
            .patch(`${URL}/${solicitud.id}`)
            .set(auth(rol))
            .send(body)
            .expect(409);
        }
        expect(await obtener(solicitud.id)).toEqual(solicitud);
      },
    );
  });

  it('el detalle expone updated_at y lo renueva al editar la cantidad', async () => {
    const solicitud = await crear();
    const original = (await obtener(solicitud.id)).detalle[0];
    expect(Number.isNaN(Date.parse(original.updated_at))).toBe(false);
    const fechaAnterior = new Date('2020-01-01T00:00:00Z');
    await prisma.solicitudProduccionDetalle.update({
      where: { id: original.id },
      data: { updated_at: fechaAnterior },
    });
    expect((await obtener(solicitud.id)).detalle[0].updated_at).toBe(
      fechaAnterior.toISOString(),
    );

    const res = await http()
      .patch(`${URL}/detalle/${original.id}`)
      .set(auth())
      .send({ cantidad_solicitada: 90 })
      .expect(200);
    const actualizada = res.body as LineaHttp;
    expect(actualizada.cantidad_solicitada).toBe(90);
    expect(Date.parse(actualizada.updated_at)).toBeGreaterThan(
      fechaAnterior.getTime(),
    );
    expect(actualizada.created_at).toBe(original.created_at);
    const persistida =
      await prisma.solicitudProduccionDetalle.findUniqueOrThrow({
        where: { id: original.id },
      });
    expect(actualizada.updated_at).toBe(persistida.updated_at.toISOString());
    expect((await obtener(solicitud.id)).detalle[0]).toEqual(actualizada);
  });

  const endpoints = [
    { metodo: 'get', ruta: '', body: undefined },
    { metodo: 'get', ruta: '/1', body: undefined },
    { metodo: 'post', ruta: '', body: { codigo: MARCA, detalle: [] } },
    { metodo: 'patch', ruta: '/1/estado', body: { estado: 'en_proceso' } },
    {
      metodo: 'post',
      ruta: '/1/detalle',
      body: { producto_terminado_id: 1, cantidad_solicitada: 1 },
    },
    { metodo: 'patch', ruta: '/detalle/1', body: { cantidad_solicitada: 1 } },
    { metodo: 'delete', ruta: '/detalle/1', body: undefined },
  ] as const;
  it.each(endpoints)(
    '$metodo $ruta exige autenticación',
    async ({ metodo, ruta, body }) => {
      await http()[metodo](`${URL}${ruta}`).send(body).expect(401);
    },
  );
  it.each(['ventas', 'cliente'] as const)(
    '%s no puede acceder a ningún endpoint',
    async (rol) => {
      for (const { metodo, ruta, body } of endpoints) {
        await http()
          [metodo](`${URL}${ruta}`)
          .set(auth(rol))
          .send(body)
          .expect(403);
      }
    },
  );

  it('producción puede consultar pero no crear ni editar líneas', async () => {
    const solicitud = await crear();
    const detalle = (await obtener(solicitud.id, 'produccion')).detalle[0];
    await http().get(URL).set(auth('produccion')).expect(200);
    await http()
      .post(URL)
      .set(auth('produccion'))
      .send({ codigo: codigo(), detalle: [linea()] })
      .expect(403);
    await http()
      .post(`${URL}/${solicitud.id}/detalle`)
      .set(auth('produccion'))
      .send(linea(1))
      .expect(403);
    await http()
      .patch(`${URL}/detalle/${detalle.id}`)
      .set(auth('produccion'))
      .send({ cantidad_solicitada: 1 })
      .expect(403);
    await http()
      .delete(`${URL}/detalle/${detalle.id}`)
      .set(auth('produccion'))
      .expect(403);
    expect((await obtener(solicitud.id)).detalle).toEqual([detalle]);
  });

  it.each(['admin', 'inventario'] as const)(
    '%s crea cabecera y detalle con su identidad, fecha y catálogo embebido',
    async (rol) => {
      const codigoCliente = codigo();
      const res = await http()
        .post(URL)
        .set(auth(rol))
        .send({
          codigo: codigoCliente,
          fecha_limite: '2026-11-15',
          detalle: [linea(), linea(1, 75)],
        })
        .expect(201);
      const creada = res.body as SolicitudHttp;
      expect(creada).toMatchObject({
        codigo: codigoCliente,
        estado: 'pendiente',
        solicitado_por: usuarios[rol],
        solicitado_por_nombre: `Solicitud ${rol} ${MARCA}`,
        fecha_limite: '2026-11-15T00:00:00.000Z',
      });
      expect(creada.fecha_creacion.slice(0, 10)).toBe(
        new Date().toISOString().slice(0, 10),
      );
      const leida = await obtener(creada.id, rol);
      expect(leida.detalle).toHaveLength(2);
      expect(leida.detalle[0]).toMatchObject({
        solicitud_produccion_id: creada.id,
        ...linea(),
        producto_nombre: `${MARCA} Chifles 0`,
        categoria_nombre: `${MARCA} Snacks`,
        presentacion_cantidad: 26100,
        presentacion_unidad_medida: 'gr',
      });
      expect(leida.detalle[0].sku).toEqual(expect.any(String));
      expect(leida.detalle[1]).toMatchObject(linea(1, 75));
    },
  );

  it('acepta fecha límite omitida y persiste el código del cliente sin generar otro', async () => {
    const creada = await crear();
    expect(creada.codigo).toMatch(new RegExp(`^${MARCA}-`));
    expect(creada.fecha_limite).toBeNull();
  });

  const invalidos: { nombre: string; cambios: Record<string, unknown> }[] = [
    { nombre: 'código ausente', cambios: { codigo: undefined } },
    { nombre: 'código vacío', cambios: { codigo: '' } },
    { nombre: 'código largo', cambios: { codigo: 'x'.repeat(51) } },
    { nombre: 'fecha inválida', cambios: { fecha_limite: '2026-02-30' } },
    { nombre: 'detalle ausente', cambios: { detalle: undefined } },
    { nombre: 'detalle vacío', cambios: { detalle: [] } },
    { nombre: 'detalle no array', cambios: { detalle: {} } },
    { nombre: 'línea sin campos', cambios: { detalle: [{}] } },
    {
      nombre: 'cantidad cero',
      cambios: {
        detalle: [{ producto_terminado_id: 1, cantidad_solicitada: 0 }],
      },
    },
    {
      nombre: 'cantidad negativa',
      cambios: {
        detalle: [{ producto_terminado_id: 1, cantidad_solicitada: -1 }],
      },
    },
    {
      nombre: 'cantidad decimal',
      cambios: {
        detalle: [{ producto_terminado_id: 1, cantidad_solicitada: 1.5 }],
      },
    },
    {
      nombre: 'producto inválido',
      cambios: {
        detalle: [{ producto_terminado_id: 0, cantidad_solicitada: 1 }],
      },
    },
    {
      nombre: 'solicitante inyectado',
      cambios: { solicitado_por: 'otro-usuario' },
    },
    { nombre: 'estado inyectado', cambios: { estado: 'entregado' } },
    {
      nombre: 'stock inyectado en línea',
      cambios: {
        detalle: [
          {
            producto_terminado_id: 1,
            cantidad_solicitada: 1,
            stock_actual: 100,
          },
        ],
      },
    },
  ];
  it.each(invalidos)(
    'rechaza $nombre sin guardar cabecera',
    async ({ cambios }) => {
      const antes = await prisma.solicitudProduccion.count({
        where: { codigo: { startsWith: MARCA } },
      });
      await http()
        .post(URL)
        .set(auth())
        .send({ codigo: codigo(), detalle: [linea()], ...cambios })
        .expect(400);
      expect(
        await prisma.solicitudProduccion.count({
          where: { codigo: { startsWith: MARCA } },
        }),
      ).toBe(antes);
    },
  );

  it('código duplicado devuelve 409 y conserva el detalle original', async () => {
    const solicitud = await crear();
    await http()
      .post(URL)
      .set(auth())
      .send({ codigo: solicitud.codigo, detalle: [linea(1)] })
      .expect(409);
    expect((await obtener(solicitud.id)).detalle).toEqual([
      expect.objectContaining(linea()),
    ]);
  });

  it('un código duplicado rodeado de espacios devuelve 409 sin duplicar la cabecera', async () => {
    const solicitud = await crear();
    await http()
      .post(URL)
      .set(auth())
      .send({ codigo: ` ${solicitud.codigo} `, detalle: [linea()] })
      .expect(409);
    expect(
      await prisma.solicitudProduccion.count({
        where: { codigo: solicitud.codigo },
      }),
    ).toBe(1);
  });

  it('no crea cabecera ni líneas parciales si se repite un producto o falta otro', async () => {
    for (const [detalle, status] of [
      [[linea(), linea()], 409],
      [
        [
          linea(),
          { producto_terminado_id: 2147483647, cantidad_solicitada: 10 },
        ],
        404,
      ],
    ] as const) {
      const codigoCliente = codigo();
      const antes = await prisma.solicitudProduccionDetalle.count();
      await http()
        .post(URL)
        .set(auth())
        .send({ codigo: codigoCliente, detalle })
        .expect(status);
      expect(
        await prisma.solicitudProduccion.findUnique({
          where: { codigo: codigoCliente },
        }),
      ).toBeNull();
      expect(await prisma.solicitudProduccionDetalle.count()).toBe(antes);
    }
  });

  it('el listado cuenta los productos sin necesitar el detalle embebido y refleja las líneas eliminadas', async () => {
    const solicitud = await crear();
    const agregada = await http()
      .post(`${URL}/${solicitud.id}/detalle`)
      .set(auth())
      .send(linea(1, 65))
      .expect(201);
    const detalle = agregada.body as LineaHttp;
    const antes = await listar({ search: solicitud.codigo });
    expect(antes.data).toEqual([
      expect.objectContaining({ id: solicitud.id, cantidad_productos: 2 }),
    ]);
    expect(antes.data[0]).not.toHaveProperty('detalle');
    await http().delete(`${URL}/detalle/${detalle.id}`).set(auth()).expect(200);
    const despues = await listar({ search: solicitud.codigo });
    expect(despues.data).toEqual([
      expect.objectContaining({ id: solicitud.id, cantidad_productos: 1 }),
    ]);
  });

  it('GET y edición de recursos inexistentes devuelven 404', async () => {
    await http().get(`${URL}/2147483647`).set(auth()).expect(404);
    await cambiar(2147483647, 'en_proceso').expect(404);
    await http()
      .post(`${URL}/2147483647/detalle`)
      .set(auth())
      .send(linea())
      .expect(404);
    await http()
      .patch(`${URL}/detalle/2147483647`)
      .set(auth())
      .send({ cantidad_solicitada: 1 })
      .expect(404);
    await http().delete(`${URL}/detalle/2147483647`).set(auth()).expect(404);
  });

  it.each(['abc', '1.5'])('rechaza identificador no entero %s', async (id) => {
    await http().get(`${URL}/${id}`).set(auth()).expect(400);
    await http()
      .patch(`${URL}/detalle/${id}`)
      .set(auth())
      .send({ cantidad_solicitada: 1 })
      .expect(400);
    await http().delete(`${URL}/detalle/${id}`).set(auth()).expect(400);
  });

  it.each(['admin', 'inventario'] as const)(
    '%s agrega, actualiza y elimina mientras queda una línea',
    async (rol) => {
      const solicitud = await crear(rol);
      const agregada = await http()
        .post(`${URL}/${solicitud.id}/detalle`)
        .set(auth(rol))
        .send(linea(1))
        .expect(201);
      const detalle = agregada.body as LineaHttp;
      expect(detalle).toMatchObject({
        solicitud_produccion_id: solicitud.id,
        ...linea(1),
      });
      const actualizada = await http()
        .patch(`${URL}/detalle/${detalle.id}`)
        .set(auth(rol))
        .send({ cantidad_solicitada: 85 })
        .expect(200);
      expect(actualizada.body).toMatchObject({
        id: detalle.id,
        cantidad_solicitada: 85,
      });
      expect((await obtener(solicitud.id)).detalle).toEqual([
        expect.objectContaining(linea()),
        expect.objectContaining({ ...linea(1, 85), id: detalle.id }),
      ]);
      await http()
        .delete(`${URL}/detalle/${detalle.id}`)
        .set(auth(rol))
        .expect(200);
      const restante = (await obtener(solicitud.id)).detalle;
      expect(restante).toEqual([expect.objectContaining(linea())]);
      await http()
        .delete(`${URL}/detalle/${restante[0].id}`)
        .set(auth(rol))
        .expect(409);
      expect((await obtener(solicitud.id)).detalle).toEqual(restante);
    },
  );

  it('agregar producto duplicado o inexistente conserva las líneas', async () => {
    const solicitud = await crear();
    const antes = (await obtener(solicitud.id)).detalle;
    await http()
      .post(`${URL}/${solicitud.id}/detalle`)
      .set(auth())
      .send(linea())
      .expect(409);
    await http()
      .post(`${URL}/${solicitud.id}/detalle`)
      .set(auth())
      .send({ producto_terminado_id: 2147483647, cantidad_solicitada: 10 })
      .expect(404);
    expect((await obtener(solicitud.id)).detalle).toEqual(antes);
    const otra = await crear();
    expect((await obtener(otra.id)).detalle).toEqual([
      expect.objectContaining(linea()),
    ]);
  });

  it.each([
    {},
    { cantidad_solicitada: 0 },
    { cantidad_solicitada: -5 },
    { cantidad_solicitada: 1.1 },
    { cantidad_solicitada: 'abc' },
  ])('valida cantidades en ambos endpoints de detalle: %j', async (body) => {
    const solicitud = await crear();
    const detalle = (await obtener(solicitud.id)).detalle[0];
    await http()
      .patch(`${URL}/detalle/${detalle.id}`)
      .set(auth())
      .send(body)
      .expect(400);
    await http()
      .post(`${URL}/${solicitud.id}/detalle`)
      .set(auth())
      .send({ producto_terminado_id: productos[1], ...body })
      .expect(400);
    expect((await obtener(solicitud.id)).detalle).toEqual([detalle]);
  });

  const estados: Estado[] = [
    'pendiente',
    'en_proceso',
    'entregado',
    'rechazado',
  ];
  it.each(
    estados.flatMap((desde) => estados.map((hasta) => ({ desde, hasta }))),
  )(
    'producción cambia $desde -> $hasta solo si está permitido',
    async ({ desde, hasta }) => {
      const solicitud = await fijarEstado(desde);
      const permitida =
        (desde === 'pendiente' &&
          ['en_proceso', 'rechazado'].includes(hasta)) ||
        (desde === 'en_proceso' && hasta === 'entregado');
      await cambiar(solicitud.id, hasta).expect(permitida ? 200 : 409);
      expect((await obtener(solicitud.id)).estado).toBe(
        permitida ? hasta : desde,
      );
    },
  );

  it.each(['admin', 'inventario'] as const)(
    '%s solo puede rechazar desde pendiente y no avanzar ni entregar',
    async (rol) => {
      const solicitud = await crear();
      await cambiar(solicitud.id, 'en_proceso', rol).expect(409);
      await cambiar(solicitud.id, 'rechazado', rol).expect(200);
      expect((await obtener(solicitud.id)).estado).toBe('rechazado');
      const iniciada = await fijarEstado('en_proceso');
      await cambiar(iniciada.id, 'rechazado', rol).expect(409);
      await cambiar(iniciada.id, 'entregado', rol).expect(409);
      expect((await obtener(iniciada.id)).estado).toBe('en_proceso');
    },
  );

  it.each(['en_proceso', 'entregado', 'rechazado'] as const)(
    'bloquea agregar, actualizar y eliminar en estado %s',
    async (estado) => {
      const solicitud = await fijarEstado(estado);
      for (const rol of ['admin', 'inventario'] as const) {
        await http()
          .post(`${URL}/${solicitud.id}/detalle`)
          .set(auth(rol))
          .send(linea(1))
          .expect(409);
        await http()
          .patch(`${URL}/detalle/${solicitud.detalle[0].id}`)
          .set(auth(rol))
          .send({ cantidad_solicitada: 10 })
          .expect(409);
        await http()
          .delete(`${URL}/detalle/${solicitud.detalle[0].id}`)
          .set(auth(rol))
          .expect(409);
      }
      expect((await obtener(solicitud.id)).detalle).toEqual(solicitud.detalle);
    },
  );

  it.each([{}, { estado: 'cancelado' }, { estado: '' }])(
    'valida el estado recibido: %j',
    async (body) => {
      const solicitud = await crear();
      await http()
        .patch(`${URL}/${solicitud.id}/estado`)
        .set(auth('produccion'))
        .send(body)
        .expect(400);
      expect((await obtener(solicitud.id)).estado).toBe('pendiente');
    },
  );

  it('crear, editar detalle y entregar no cambian stock ni generan lotes o movimientos', async () => {
    const snapshot = async () => ({
      stock: await prisma.productoTerminado.findMany({
        where: { id: { in: productos } },
        orderBy: { id: 'asc' },
      }),
      lotes: await prisma.loteProductoTerminado.findMany({
        where: { producto_terminado_id: { in: productos } },
        orderBy: { id: 'asc' },
      }),
      movimientos: await prisma.movimientoProductoTerminado.findMany({
        where: {
          lote_producto_terminado: { producto_terminado_id: { in: productos } },
        },
      }),
    });
    const antes = await snapshot();
    expect(Number(antes.stock[0].stock_actual)).toBe(25);
    const solicitud = await crear();
    const detalle = (await obtener(solicitud.id)).detalle[0];
    await http()
      .patch(`${URL}/detalle/${detalle.id}`)
      .set(auth())
      .send({ cantidad_solicitada: 1000 })
      .expect(200);
    await cambiar(solicitud.id, 'en_proceso').expect(200);
    await cambiar(solicitud.id, 'entregado').expect(200);
    expect((await obtener(solicitud.id)).estado).toBe('entregado');
    expect(await snapshot()).toEqual(antes);
  });

  it('lista por código, nombre y SKU; filtra estado, fechas inclusivas y paginación', async () => {
    const uno = await crear();
    const dos = await crear();
    await prisma.solicitudProduccion.update({
      where: { id: uno.id },
      data: { fecha_creacion: new Date('2026-10-05'), estado: 'rechazado' },
    });
    await prisma.solicitudProduccion.update({
      where: { id: dos.id },
      data: { fecha_creacion: new Date('2026-10-06'), estado: 'rechazado' },
    });
    expect(
      (await listar({ search: uno.codigo.toLowerCase() })).data.map(
        (s) => s.id,
      ),
    ).toContain(uno.id);
    const detalle = (await obtener(uno.id)).detalle[0];
    for (const search of [
      detalle.sku.toLowerCase(),
      detalle.producto_nombre.toLowerCase(),
    ]) {
      expect(
        (
          await listar({
            search,
            estado: 'rechazado',
            fecha_desde: '2026-10-05',
            fecha_hasta: '2026-10-06',
          })
        ).data.map((s) => s.id),
      ).toEqual(expect.arrayContaining([uno.id, dos.id]));
    }
    const primerDia = await listar({
      search: MARCA,
      fecha_desde: '2026-10-05',
      fecha_hasta: '2026-10-05',
    });
    expect(primerDia.data.map((s) => s.id)).toEqual([uno.id]);
    const filtros = {
      search: MARCA,
      estado: 'rechazado',
      fecha_desde: '2026-10-05',
      fecha_hasta: '2026-10-06',
      limit: 1,
    };
    const pagina1 = await listar({ ...filtros, page: 1 });
    const pagina2 = await listar({ ...filtros, page: 2 });
    expect(pagina1.meta).toEqual({
      total: 2,
      page: 1,
      limit: 1,
      total_pages: 2,
    });
    expect(pagina2.meta).toEqual({
      total: 2,
      page: 2,
      limit: 1,
      total_pages: 2,
    });
    expect(
      new Set([...pagina1.data, ...pagina2.data].map((s) => s.id)),
    ).toEqual(new Set([uno.id, dos.id]));
    const vacia = await listar({ search: `${MARCA}-inexistente` });
    expect(vacia).toEqual({
      data: [],
      meta: { total: 0, page: 1, limit: 10, total_pages: 0 },
    });
  });

  it.each([
    { page: 0 },
    { limit: 101 },
    { estado: 'cancelado' },
    { fecha_desde: 'ayer' },
    { fecha_hasta: '2026-02-30' },
  ])('valida filtros de lista: %j', async (query) => {
    await http().get(URL).set(auth()).query(query).expect(400);
  });
});
