import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';

const MARCA = 'E2E264SIN';
const URL = '/api/v1/produccion/solicitudes-insumos';
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
  solicitud_insumos_id: number;
  insumo_id: number;
  insumo_sku: string;
  insumo_nombre: string;
  insumo_unidad_medida: string;
  cantidad_solicitada: number;
  created_at: string;
}
interface SolicitudHttp {
  id: number;
  codigo_solicitud: string;
  solicitud_produccion_id: number | null;
  cantidad_insumos: number;
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

// Oraculo independiente del helper de produccion y de la zona horaria del equipo.
const diaCalendarioLima = () => {
  const partes = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return ['year', 'month', 'day']
    .map((tipo) => partes.find((parte) => parte.type === tipo)?.value)
    .join('-');
};

describe('Solicitudes de insumos OFT0-264 (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const tokens = {} as Record<Rol, string>;
  const usuarios = {} as Record<Rol, string>;
  const personas: string[] = [];
  const insumos: number[] = [];
  const padres: number[] = [];
  let secuencia = 0;
  const codigo = () => `${MARCA}-${++secuencia}`;
  const http = () => request(app.getHttpServer());
  const auth = (rol: Rol = 'produccion') => ({
    Authorization: `Bearer ${tokens[rol]}`,
  });
  const linea = (indice = 0, cantidad = 10) => ({
    insumo_id: insumos[indice],
    cantidad_solicitada: cantidad,
  });
  const crear = async (
    rol: Rol = 'produccion',
    detalle = [linea()],
    solicitud_produccion_id?: number,
  ) => {
    const res = await http()
      .post(URL)
      .set(auth(rol))
      .send({
        codigo_solicitud: codigo(),
        detalle,
        ...(solicitud_produccion_id === undefined
          ? {}
          : { solicitud_produccion_id }),
      })
      .expect(201);
    return res.body as SolicitudHttp;
  };
  const obtener = async (id: number, rol: Rol = 'produccion') =>
    (await http().get(`${URL}/${id}`).set(auth(rol)).expect(200))
      .body as SolicitudHttp;
  const cambiar = (
    id: number,
    estado: Estado,
    rol: Rol = 'inventario',
    items?: { insumo_id: number; cantidad_entregada: number }[],
  ) =>
    http()
      .patch(`${URL}/${id}/estado`)
      .set(auth(rol))
      .send({ estado, ...(items === undefined ? {} : { items }) });
  const listar = async (
    query: Record<string, string | number> = {},
    rol: Rol = 'produccion',
  ) =>
    (await http().get(URL).set(auth(rol)).query(query).expect(200))
      .body as ListaHttp;
  const fijarEstado = async (estado: Estado) => {
    const solicitud = await crear();
    await prisma.solicitudInsumos.update({
      where: { id: solicitud.id },
      data: { estado },
    });
    return obtener(solicitud.id);
  };
  const nuevoInsumo = async (sufijo: string) => {
    const creado = await prisma.insumo.create({
      data: {
        sku: codigo(),
        nombre: `${MARCA} ${sufijo}`,
        unidad_medida: 'kg',
        tipo: 'materia_prima',
        stock_minimo: 0,
        stock_maximo: 1000,
        estado: true,
      },
    });
    insumos.push(creado.id);
    return creado.id;
  };
  const lote = async (
    insumo_id: number,
    cantidad: number,
    dias = 30,
    activo = true,
  ) => {
    const res = await http()
      .post('/api/v1/lotes-insumo')
      .set(auth('inventario'))
      .send({
        insumo_id,
        codigo_lote: codigo(),
        fecha_ingreso: new Date().toISOString().slice(0, 10),
        fecha_vencimiento: new Date(Date.now() + dias * 86400000)
          .toISOString()
          .slice(0, 10),
        cantidad_inicial: cantidad,
        activo,
      })
      .expect(201);
    return res.body as { id: number };
  };
  const snapshot = async (ids = insumos) => ({
    insumos: await prisma.insumo.findMany({
      where: { id: { in: ids } },
      orderBy: { id: 'asc' },
    }),
    lotes: await prisma.loteInsumo.findMany({
      where: { insumo_id: { in: ids } },
      orderBy: { id: 'asc' },
    }),
    movimientos: await prisma.movimientoInsumo.findMany({
      where: { lote_insumo: { insumo_id: { in: ids } } },
      orderBy: { id: 'asc' },
    }),
  });
  const limpiar = async () => {
    await prisma.movimientoInsumo.deleteMany({
      where: { lote_insumo: { insumo_id: { in: insumos } } },
    });
    await prisma.solicitudInsumosDetalle.deleteMany({
      where: { solicitud_insumos: { codigo_solicitud: { startsWith: MARCA } } },
    });
    await prisma.solicitudInsumos.deleteMany({
      where: { codigo_solicitud: { startsWith: MARCA } },
    });
    await prisma.loteInsumo.deleteMany({
      where: { insumo_id: { in: insumos } },
    });
    await prisma.insumo.deleteMany({ where: { id: { in: insumos } } });
    await prisma.solicitudProduccion.deleteMany({
      where: { id: { in: padres } },
    });
    const ids = Object.values(usuarios);
    await prisma.refreshToken.deleteMany({ where: { user_id: { in: ids } } });
    await prisma.usuarioRol.deleteMany({ where: { user_id: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.persona.deleteMany({ where: { id: { in: personas } } });
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    // El globalSetup aplica migrate deploy sobre la plantilla de TEST antes de clonar el worker.
    const aplicada = await prisma.$queryRaw<
      { aplicada: boolean }[]
    >`SELECT finished_at IS NOT NULL AS aplicada FROM public._prisma_migrations WHERE migration_name = '20261104232850_solicitud_insumos_oft0_264'`;
    expect(aplicada).toEqual([{ aplicada: true }]);
    const password = 'Prueba264!';
    const contrasena = await hashPassword(password);
    for (const [i, rol] of ROLES.entries()) {
      const persona = await prisma.persona.create({
        data: {
          nombres: MARCA,
          apellido_paterno: rol,
          apellido_materno: 'Prueba',
          tipo_documento: 'dni',
          numero_documento: `9926400${i}`,
        },
      });
      personas.push(persona.id);
      const user = await prisma.user.create({
        data: {
          persona_id: persona.id,
          username: `e2e264-insumos-${rol}`,
          email: `e2e264-insumos-${rol}@francos.test`,
          contrasena,
          estado: true,
          email_verificado: true,
        },
      });
      usuarios[rol] = user.id;
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
    await nuevoInsumo('Harina');
    await nuevoInsumo('Azúcar');
    await nuevoInsumo('Bolsas');
    for (let i = 0; i < 2; i++) {
      const padre = await prisma.solicitudProduccion.create({
        data: {
          codigo: codigo(),
          fecha_creacion: new Date(),
          solicitado_por: usuarios.produccion,
        },
      });
      padres.push(padre.id);
    }
  }, 60000);
  afterAll(async () => {
    try {
      if (prisma) await limpiar();
    } finally {
      if (app) await app.close();
    }
  }, 60000);

  const endpoints = [
    { metodo: 'get', ruta: '', body: undefined },
    { metodo: 'get', ruta: '/indicadores', body: undefined },
    { metodo: 'get', ruta: '/1', body: undefined },
    { metodo: 'post', ruta: '', body: {} },
    { metodo: 'patch', ruta: '/1', body: { fecha_limite: '2026-12-01' } },
    { metodo: 'patch', ruta: '/1/estado', body: { estado: 'en_proceso' } },
    {
      metodo: 'post',
      ruta: '/1/detalle',
      body: { insumo_id: 1, cantidad_solicitada: 1 },
    },
    { metodo: 'patch', ruta: '/detalle/1', body: { cantidad_solicitada: 1 } },
    { metodo: 'delete', ruta: '/detalle/1', body: undefined },
  ] as const;
  it.each(endpoints)(
    '$metodo $ruta requiere token',
    async ({ metodo, ruta, body }) => {
      await http()[metodo](`${URL}${ruta}`).send(body).expect(401);
    },
  );
  it.each(['ventas', 'cliente'] as const)(
    '%s no accede a ninguna operación',
    async (rol) => {
      for (const { metodo, ruta, body } of endpoints)
        await http()
          [metodo](`${URL}${ruta}`)
          .set(auth(rol))
          .send(body)
          .expect(403);
    },
  );

  it.each(['admin', 'inventario', 'produccion'] as const)(
    '%s consulta indicadores vacíos y la ruta no se confunde con :id',
    async (rol) => {
      const res = await http()
        .get(`${URL}/indicadores`)
        .set(auth(rol))
        .expect(200);
      expect(res.body).toEqual({
        pendiente: 0,
        en_proceso: 0,
        entregado: 0,
        rechazado: 0,
        total: 0,
      });
    },
  );

  it.each(['admin', 'produccion'] as const)(
    '%s crea cabecera, decimales y detalle embebido sin vínculo ni updated_at en líneas',
    async (rol) => {
      const antes = await snapshot();
      const diaAntes = diaCalendarioLima();
      const res = await http()
        .post(URL)
        .set(auth(rol))
        .send({
          codigo_solicitud: codigo(),
          fecha_limite: '2026-12-15',
          detalle: [linea(0, 10.25), linea(1, 2.5)],
        })
        .expect(201);
      const creada = res.body as SolicitudHttp;
      expect([diaAntes, diaCalendarioLima()]).toContain(
        creada.fecha_creacion.slice(0, 10),
      );
      expect(creada).toMatchObject({
        estado: 'pendiente',
        solicitud_produccion_id: null,
        cantidad_insumos: 2,
        solicitado_por: usuarios[rol],
        solicitado_por_nombre: `${MARCA} ${rol} Prueba`,
        fecha_limite: '2026-12-15T00:00:00.000Z',
      });
      for (const lector of ['admin', 'inventario', 'produccion'] as const) {
        const leida = await obtener(creada.id, lector);
        expect(leida.detalle).toHaveLength(2);
        expect(leida.detalle[0]).toMatchObject({
          ...linea(0, 10.25),
          insumo_nombre: `${MARCA} Harina`,
          insumo_unidad_medida: 'kg',
          solicitud_insumos_id: creada.id,
        });
        expect(leida.detalle[0].insumo_sku).toEqual(expect.any(String));
        for (const detalle of leida.detalle) {
          expect(detalle).not.toHaveProperty('updated_at');
          expect(Number.isNaN(Date.parse(detalle.created_at))).toBe(false);
        }
        const lista = await listar({ search: creada.codigo_solicitud }, lector);
        expect(lista.data).toHaveLength(1);
        expect(lista.data[0].cantidad_insumos).toBe(2);
        expect(lista.data[0]).not.toHaveProperty('detalle');
      }
      expect(await snapshot()).toEqual(antes);
    },
  );

  it('recorta código, conserva el vínculo opcional y filtra por solicitud de producción', async () => {
    const codigoSolicitud = codigo();
    const res = await http()
      .post(URL)
      .set(auth())
      .send({
        codigo_solicitud: ` ${codigoSolicitud} `,
        solicitud_produccion_id: padres[0],
        detalle: [linea()],
      })
      .expect(201);
    const creada = res.body as SolicitudHttp;
    const otra = await crear('produccion', [linea()], padres[1]);
    expect(creada.codigo_solicitud).toBe(codigoSolicitud);
    expect((await obtener(creada.id)).solicitud_produccion_id).toBe(padres[0]);
    const filtrada = await listar({
      solicitud_produccion_id: padres[0],
      search: MARCA,
    });
    expect(filtrada.data.map((s) => s.id)).toEqual([creada.id]);
    expect(filtrada.data.map((s) => s.id)).not.toContain(otra.id);
  });

  it('404 de solicitud de producción o insumo inexistente y 409 de insumo repetido no crean nada parcial', async () => {
    for (const [cambios, status] of [
      [{ solicitud_produccion_id: 2147483647 }, 404],
      [
        {
          detalle: [linea(), { insumo_id: 2147483647, cantidad_solicitada: 1 }],
        },
        404,
      ],
      [{ detalle: [linea(), linea()] }, 409],
    ] as const) {
      const antes = await prisma.solicitudInsumosDetalle.count();
      const codigoSolicitud = codigo();
      await http()
        .post(URL)
        .set(auth())
        .send({
          codigo_solicitud: codigoSolicitud,
          detalle: [linea()],
          ...cambios,
        })
        .expect(status);
      expect(
        await prisma.solicitudInsumos.findUnique({
          where: { codigo_solicitud: codigoSolicitud },
        }),
      ).toBeNull();
      expect(await prisma.solicitudInsumosDetalle.count()).toBe(antes);
    }
  });

  it('el código duplicado, incluso con espacios, devuelve 409 y conserva el detalle', async () => {
    const creada = await crear();
    const antes = (await obtener(creada.id)).detalle;
    for (const codigo_solicitud of [
      creada.codigo_solicitud,
      ` ${creada.codigo_solicitud} `,
    ])
      await http()
        .post(URL)
        .set(auth())
        .send({ codigo_solicitud, detalle: [linea(1)] })
        .expect(409);
    expect((await obtener(creada.id)).detalle).toEqual(antes);
  });

  it('inventario consulta pero no puede crear ni editar cabecera o líneas', async () => {
    const solicitud = await crear();
    const antes = await obtener(solicitud.id, 'inventario');
    await listar({ search: solicitud.codigo_solicitud }, 'inventario');
    await http()
      .post(URL)
      .set(auth('inventario'))
      .send({ codigo_solicitud: codigo(), detalle: [linea()] })
      .expect(403);
    await http()
      .patch(`${URL}/${solicitud.id}`)
      .set(auth('inventario'))
      .send({ fecha_limite: '2026-12-01' })
      .expect(403);
    await http()
      .post(`${URL}/${solicitud.id}/detalle`)
      .set(auth('inventario'))
      .send(linea(1))
      .expect(403);
    await http()
      .patch(`${URL}/detalle/${antes.detalle[0].id}`)
      .set(auth('inventario'))
      .send({ cantidad_solicitada: 1 })
      .expect(403);
    await http()
      .delete(`${URL}/detalle/${antes.detalle[0].id}`)
      .set(auth('inventario'))
      .expect(403);
    expect(await obtener(solicitud.id)).toEqual(antes);
  });

  it.each(['admin', 'produccion'] as const)(
    '%s edita fecha y líneas mientras pendiente sin dejar cero líneas',
    async (rol) => {
      const solicitud = await crear(rol);
      const inicial = (await obtener(solicitud.id)).detalle[0];
      await http()
        .patch(`${URL}/${solicitud.id}`)
        .set(auth(rol))
        .send({ fecha_limite: '2026-12-01' })
        .expect(200);
      expect((await obtener(solicitud.id)).fecha_limite).toBe(
        '2026-12-01T00:00:00.000Z',
      );
      const agregada = await http()
        .post(`${URL}/${solicitud.id}/detalle`)
        .set(auth(rol))
        .send(linea(1, 2.75))
        .expect(201);
      const detalle = agregada.body as LineaHttp;
      expect(detalle).not.toHaveProperty('updated_at');
      const actualizada = await http()
        .patch(`${URL}/detalle/${detalle.id}`)
        .set(auth(rol))
        .send({ cantidad_solicitada: 7.5 })
        .expect(200);
      expect(actualizada.body).toMatchObject({
        cantidad_solicitada: 7.5,
        created_at: detalle.created_at,
      });
      expect(actualizada.body).not.toHaveProperty('updated_at');
      expect(
        (await listar({ search: solicitud.codigo_solicitud })).data[0]
          .cantidad_insumos,
      ).toBe(2);
      await http()
        .delete(`${URL}/detalle/${detalle.id}`)
        .set(auth(rol))
        .expect(200);
      expect(
        (await listar({ search: solicitud.codigo_solicitud })).data[0]
          .cantidad_insumos,
      ).toBe(1);
      await http()
        .delete(`${URL}/detalle/${inicial.id}`)
        .set(auth(rol))
        .expect(409);
      expect((await obtener(solicitud.id)).detalle).toEqual([inicial]);
    },
  );

  it('no permite agregar un insumo duplicado o inexistente ni altera otras solicitudes', async () => {
    const solicitud = await crear();
    const otra = await crear();
    const antes = (await obtener(solicitud.id)).detalle;
    await http()
      .post(`${URL}/${solicitud.id}/detalle`)
      .set(auth())
      .send(linea())
      .expect(409);
    await http()
      .post(`${URL}/${solicitud.id}/detalle`)
      .set(auth())
      .send({ insumo_id: 2147483647, cantidad_solicitada: 1 })
      .expect(404);
    expect((await obtener(solicitud.id)).detalle).toEqual(antes);
    expect((await obtener(otra.id)).detalle[0]).toMatchObject(linea());
  });

  it.each(['en_proceso', 'entregado', 'rechazado'] as const)(
    'bloquea fecha y todas las ediciones en estado %s',
    async (estado) => {
      const solicitud = await fijarEstado(estado);
      for (const rol of ['admin', 'produccion'] as const) {
        await http()
          .patch(`${URL}/${solicitud.id}`)
          .set(auth(rol))
          .send({ fecha_limite: '2026-12-01' })
          .expect(409);
        await http()
          .post(`${URL}/${solicitud.id}/detalle`)
          .set(auth(rol))
          .send(linea(1))
          .expect(409);
        await http()
          .patch(`${URL}/detalle/${solicitud.detalle[0].id}`)
          .set(auth(rol))
          .send({ cantidad_solicitada: 1 })
          .expect(409);
        await http()
          .delete(`${URL}/detalle/${solicitud.detalle[0].id}`)
          .set(auth(rol))
          .expect(409);
      }
      expect((await obtener(solicitud.id)).detalle).toEqual(solicitud.detalle);
    },
  );

  it('devuelve 404 para cabeceras y líneas inexistentes sin mutar', async () => {
    await http().get(`${URL}/2147483647`).set(auth()).expect(404);
    await cambiar(2147483647, 'en_proceso').expect(404);
    await http()
      .patch(`${URL}/2147483647`)
      .set(auth())
      .send({ fecha_limite: '2026-12-01' })
      .expect(404);
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

  it('lista por código, SKU y nombre; filtra estado y fechas inclusivas y pagina sin repetir', async () => {
    const a = await crear();
    const b = await crear();
    const c = await crear();
    for (const [solicitud, dia] of [
      [a, '2026-11-01'],
      [b, '2026-11-02'],
      [c, '2026-11-03'],
    ] as const)
      await prisma.solicitudInsumos.update({
        where: { id: solicitud.id },
        data: { fecha_creacion: new Date(dia) },
      });
    await prisma.solicitudInsumos.update({
      where: { id: b.id },
      data: { estado: 'rechazado' },
    });
    const dia = await listar({
      search: MARCA,
      fecha_desde: '2026-11-02',
      fecha_hasta: '2026-11-02',
    });
    expect(dia.data.map((s) => s.id)).toEqual([b.id]);
    expect(
      (
        await listar({
          search: MARCA,
          estado: 'rechazado',
          fecha_desde: '2026-11-01',
          fecha_hasta: '2026-11-03',
        })
      ).data.map((s) => s.id),
    ).toEqual([b.id]);
    const rango = {
      search: MARCA,
      fecha_desde: '2026-11-01',
      fecha_hasta: '2026-11-03',
      limit: 2,
    };
    const p1 = await listar({ ...rango, page: 1 });
    const p2 = await listar({ ...rango, page: 2 });
    expect(p1.meta).toEqual({ total: 3, page: 1, limit: 2, total_pages: 2 });
    expect(new Set([...p1.data, ...p2.data].map((s) => s.id))).toEqual(
      new Set([a.id, b.id, c.id]),
    );
    const insumo = await prisma.insumo.findUniqueOrThrow({
      where: { id: insumos[0] },
    });
    for (const search of [insumo.sku, insumo.nombre])
      expect((await listar({ search })).data.some((s) => s.id === a.id)).toBe(
        true,
      );
    expect((await listar({ search: `${MARCA}-inexistente` })).data).toEqual([]);
    await http()
      .get(URL)
      .set(auth())
      .query({ fecha_desde: '2026-11-03', fecha_hasta: '2026-11-02' })
      .expect(400);
  });

  it('cuenta cada estado en indicadores después de crear y cambiar estados', async () => {
    const antes = (
      await http().get(`${URL}/indicadores`).set(auth()).expect(200)
    ).body as Record<Estado | 'total', number>;
    const creadas: SolicitudHttp[] = [];
    for (const estado of [
      'pendiente',
      'en_proceso',
      'entregado',
      'rechazado',
    ] as const) {
      const solicitud = await crear();
      creadas.push(solicitud);
      await prisma.solicitudInsumos.update({
        where: { id: solicitud.id },
        data: { estado },
      });
    }
    expect(
      (
        await http()
          .get(`${URL}/indicadores`)
          .set(auth('inventario'))
          .expect(200)
      ).body,
    ).toEqual({
      pendiente: antes.pendiente + 1,
      en_proceso: antes.en_proceso + 1,
      entregado: antes.entregado + 1,
      rechazado: antes.rechazado + 1,
      total: antes.total + 4,
    });
    await cambiar(creadas[0].id, 'rechazado', 'produccion').expect(200);
    expect(
      (await http().get(`${URL}/indicadores`).set(auth()).expect(200)).body,
    ).toEqual({
      pendiente: antes.pendiente,
      en_proceso: antes.en_proceso + 1,
      entregado: antes.entregado + 1,
      rechazado: antes.rechazado + 2,
      total: antes.total + 4,
    });
  });

  const estados: Estado[] = [
    'pendiente',
    'en_proceso',
    'entregado',
    'rechazado',
  ];
  it.each(
    estados.flatMap((desde) => estados.map((hasta) => ({ desde, hasta }))),
  )('inventario: $desde -> $hasta', async ({ desde, hasta }) => {
    const solicitud = await fijarEstado(desde);
    const permitida =
      (desde === 'pendiente' && ['en_proceso', 'rechazado'].includes(hasta)) ||
      (desde === 'en_proceso' && hasta === 'entregado');
    if (permitida && hasta === 'entregado') await lote(insumos[0], 10);
    const antes = await snapshot();
    await cambiar(solicitud.id, hasta).expect(permitida ? 200 : 409);
    expect((await obtener(solicitud.id)).estado).toBe(
      permitida ? hasta : desde,
    );
    if (!permitida || hasta !== 'entregado')
      expect(await snapshot()).toEqual(antes);
  });

  it.each(['admin', 'inventario', 'produccion'] as const)(
    '%s puede rechazar solo desde pendiente sin consumir stock',
    async (rol) => {
      const solicitud = await crear();
      const antes = await snapshot();
      await cambiar(solicitud.id, 'rechazado', rol).expect(200);
      expect((await obtener(solicitud.id)).estado).toBe('rechazado');
      expect(await snapshot()).toEqual(antes);
    },
  );

  it('producción no inicia ni entrega, incluso cuando ya existe stock', async () => {
    const id = await nuevoInsumo('Permisos');
    await lote(id, 20);
    const solicitud = await crear('produccion', [
      { insumo_id: id, cantidad_solicitada: 5 },
    ]);
    const antes = await snapshot([id]);
    await cambiar(solicitud.id, 'en_proceso', 'produccion').expect(409);
    await cambiar(solicitud.id, 'en_proceso', 'inventario').expect(200);
    await cambiar(solicitud.id, 'entregado', 'produccion').expect(409);
    expect((await obtener(solicitud.id)).estado).toBe('en_proceso');
    expect(await snapshot([id])).toEqual(antes);
  });

  it.each(['admin', 'inventario'] as const)(
    '%s entrega usando FEFO, descuenta cada insumo y conserva la trazabilidad al leer movimientos',
    async (rol) => {
      const a = await nuevoInsumo(`FEFO-A-${rol}`);
      const b = await nuevoInsumo(`FEFO-B-${rol}`);
      const lejano = await lote(a, 10, 180);
      const cercano = await lote(a, 3, 30);
      const segundo = await lote(b, 5, 90);
      const solicitud = await crear('produccion', [
        { insumo_id: a, cantidad_solicitada: 7.25 },
        { insumo_id: b, cantidad_solicitada: 2.5 },
      ]);
      const antes = await snapshot([a, b]);
      await cambiar(solicitud.id, 'en_proceso', rol).expect(200);
      expect(await snapshot([a, b])).toEqual(antes);
      await cambiar(solicitud.id, 'entregado', rol).expect(200);
      const movimientos = await prisma.movimientoInsumo.findMany({
        where: { solicitud_insumos_id: solicitud.id },
        orderBy: { id: 'asc' },
      });
      expect(movimientos).toHaveLength(3);
      expect(
        movimientos.map((m) => ({
          lote: m.lote_insumo_id,
          cantidad: m.cantidad.toNumber(),
        })),
      ).toEqual([
        { lote: cercano.id, cantidad: 3 },
        { lote: lejano.id, cantidad: 4.25 },
        { lote: segundo.id, cantidad: 2.5 },
      ]);
      for (const m of movimientos) {
        expect(m.tipo).toBe('salida');
        expect(m.razon).toBe(
          `Salida por solicitud de insumos ${solicitud.codigo_solicitud}`,
        );
        expect(m.solicitud_insumos_id).toBe(solicitud.id);
      }
      expect(
        (
          await prisma.insumo.findUniqueOrThrow({ where: { id: a } })
        ).stock_actual.toNumber(),
      ).toBe(5.75);
      expect(
        (
          await prisma.insumo.findUniqueOrThrow({ where: { id: b } })
        ).stock_actual.toNumber(),
      ).toBe(2.5);
      expect(
        (
          await prisma.loteInsumo.findUniqueOrThrow({
            where: { id: cercano.id },
          })
        ).cantidad_actual.toNumber(),
      ).toBe(0);
      expect(
        (
          await prisma.loteInsumo.findUniqueOrThrow({
            where: { id: lejano.id },
          })
        ).cantidad_actual.toNumber(),
      ).toBe(5.75);
      const listado = await http()
        .get('/api/v1/movimientos-insumo')
        .set(auth('inventario'))
        .query({ insumo_id: a, limit: 100 })
        .expect(200);
      const salidas = (
        listado.body as {
          data: { tipo: string; solicitud_insumos_id: number | null }[];
        }
      ).data.filter((m) => m.tipo === 'salida');
      expect(salidas).toHaveLength(2);
      expect(
        salidas.every((m) => m.solicitud_insumos_id === solicitud.id),
      ).toBe(true);
      const despues = await snapshot([a, b]);
      await cambiar(solicitud.id, 'entregado', rol).expect(409);
      expect(await snapshot([a, b])).toEqual(despues);
    },
  );

  it.each(['admin', 'inventario'] as const)(
    '%s entrega cantidades explícitas distintas a las solicitadas aunque items venga en otro orden',
    async (rol) => {
      const a = await nuevoInsumo(`Explicito-A-${rol}`);
      const b = await nuevoInsumo(`Explicito-B-${rol}`);
      const lejano = await lote(a, 10, 180);
      const cercano = await lote(a, 2, 30);
      const segundo = await lote(b, 20, 90);
      const solicitud = await crear('produccion', [
        { insumo_id: a, cantidad_solicitada: 8 },
        { insumo_id: b, cantidad_solicitada: 3 },
      ]);
      const items = [
        { insumo_id: b, cantidad_entregada: 5.75 },
        { insumo_id: a, cantidad_entregada: 3.5 },
      ];
      await cambiar(solicitud.id, 'en_proceso', rol).expect(200);
      await cambiar(solicitud.id, 'entregado', rol, items).expect(200);
      const movimientos = await prisma.movimientoInsumo.findMany({
        where: { solicitud_insumos_id: solicitud.id },
        orderBy: { id: 'asc' },
      });
      expect(
        movimientos.map((m) => ({
          lote: m.lote_insumo_id,
          cantidad: m.cantidad.toNumber(),
        })),
      ).toEqual([
        { lote: cercano.id, cantidad: 2 },
        { lote: lejano.id, cantidad: 1.5 },
        { lote: segundo.id, cantidad: 5.75 },
      ]);
      expect(
        movimientos.every(
          (m) => m.tipo === 'salida' && m.solicitud_insumos_id === solicitud.id,
        ),
      ).toBe(true);
      const despues = await snapshot([a, b]);
      expect(despues.insumos.map((i) => i.stock_actual.toNumber())).toEqual([
        8.5, 14.25,
      ]);
      const leida = await obtener(solicitud.id);
      expect(leida.estado).toBe('entregado');
      expect(leida.detalle.map((d) => d.cantidad_solicitada)).toEqual([8, 3]);
      await cambiar(solicitud.id, 'entregado', rol, items).expect(409);
      expect(await snapshot([a, b])).toEqual(despues);
    },
  );

  it.each([
    'faltante',
    'sobrante',
    'ajeno',
    'repetido',
    'repetido-extra',
  ] as const)(
    'items %s devuelve 400 sin crear movimientos ni cambiar stock o estado',
    async (caso) => {
      const a = await nuevoInsumo(`Match-A-${caso}`);
      const b = await nuevoInsumo(`Match-B-${caso}`);
      await lote(a, 8);
      await lote(b, 8);
      const solicitud = await crear('produccion', [
        { insumo_id: a, cantidad_solicitada: 2 },
        { insumo_id: b, cantidad_solicitada: 2 },
      ]);
      await cambiar(solicitud.id, 'en_proceso').expect(200);
      const primero = { insumo_id: a, cantidad_entregada: 1 };
      const segundo = { insumo_id: b, cantidad_entregada: 1 };
      const ajeno = { insumo_id: 2147483647, cantidad_entregada: 1 };
      const items =
        caso === 'faltante'
          ? [primero]
          : caso === 'sobrante'
            ? [primero, segundo, ajeno]
            : caso === 'ajeno'
              ? [primero, ajeno]
              : caso === 'repetido'
                ? [primero, primero]
                : [primero, segundo, primero];
      const antes = await snapshot([a, b]);
      const res = await cambiar(
        solicitud.id,
        'entregado',
        'inventario',
        items,
      ).expect(400);
      expect(res.body).toMatchObject({
        message:
          'Las cantidades entregadas no coinciden con las líneas del detalle',
      });
      expect((await obtener(solicitud.id)).estado).toBe('en_proceso');
      expect(await snapshot([a, b])).toEqual(antes);
      expect(
        await prisma.movimientoInsumo.count({
          where: { solicitud_insumos_id: solicitud.id },
        }),
      ).toBe(0);
    },
  );

  it('valida stock con la cantidad entregada y revierte todo si la segunda línea no alcanza', async () => {
    const a = await nuevoInsumo('Explicito-atomico-A');
    const b = await nuevoInsumo('Explicito-atomico-B');
    await lote(a, 10);
    await lote(b, 1);
    const solicitud = await crear('produccion', [
      { insumo_id: a, cantidad_solicitada: 1 },
      { insumo_id: b, cantidad_solicitada: 1 },
    ]);
    const items = [
      { insumo_id: a, cantidad_entregada: 2 },
      { insumo_id: b, cantidad_entregada: 5 },
    ];
    await cambiar(solicitud.id, 'en_proceso').expect(200);
    const antes = await snapshot([a, b]);
    await cambiar(solicitud.id, 'entregado', 'inventario', items).expect(409);
    expect((await obtener(solicitud.id)).estado).toBe('en_proceso');
    expect(await snapshot([a, b])).toEqual(antes);
    expect(
      await prisma.movimientoInsumo.count({
        where: { solicitud_insumos_id: solicitud.id },
      }),
    ).toBe(0);
    await lote(b, 4);
    await cambiar(solicitud.id, 'entregado', 'inventario', items).expect(200);
    expect(
      (await snapshot([a, b])).insumos.map((i) => i.stock_actual.toNumber()),
    ).toEqual([8, 0]);
  });

  it.each([
    'vacio',
    'objeto',
    'sin-cantidad',
    'cero',
    'negativa',
    'decimales',
    'id-invalido',
    'campo-extra',
  ] as const)(
    'valida el DTO de items %s sin efectos parciales',
    async (caso) => {
      const solicitud = await fijarEstado('en_proceso');
      const item = { insumo_id: insumos[0], cantidad_entregada: 1 };
      const items =
        caso === 'vacio'
          ? []
          : caso === 'objeto'
            ? item
            : caso === 'sin-cantidad'
              ? [{ insumo_id: insumos[0] }]
              : caso === 'cero'
                ? [{ ...item, cantidad_entregada: 0 }]
                : caso === 'negativa'
                  ? [{ ...item, cantidad_entregada: -1 }]
                  : caso === 'decimales'
                    ? [{ ...item, cantidad_entregada: 1.001 }]
                    : caso === 'id-invalido'
                      ? [{ ...item, insumo_id: 0 }]
                      : [{ ...item, campo_extra: true }];
      const antes = await snapshot([insumos[0]]);
      await http()
        .patch(`${URL}/${solicitud.id}/estado`)
        .set(auth('inventario'))
        .send({ estado: 'entregado', items })
        .expect(400);
      expect((await obtener(solicitud.id)).estado).toBe('en_proceso');
      expect(await snapshot([insumos[0]])).toEqual(antes);
    },
  );

  it.each(['admin', 'inventario'] as const)(
    '%s recibe 409 por la segunda línea sin stock: ninguna salida ni estado parcial',
    async (rol) => {
      const a = await nuevoInsumo(`Atomico-A-${rol}`);
      const b = await nuevoInsumo(`Atomico-B-${rol}`);
      await lote(a, 10);
      await lote(b, 1);
      const solicitud = await crear('produccion', [
        { insumo_id: a, cantidad_solicitada: 2 },
        { insumo_id: b, cantidad_solicitada: 5 },
      ]);
      await cambiar(solicitud.id, 'en_proceso', rol).expect(200);
      const antes = await snapshot([a, b]);
      await cambiar(solicitud.id, 'entregado', rol).expect(409);
      expect((await obtener(solicitud.id)).estado).toBe('en_proceso');
      expect(await snapshot([a, b])).toEqual(antes);
      expect(
        await prisma.movimientoInsumo.count({
          where: { solicitud_insumos_id: solicitud.id },
        }),
      ).toBe(0);
      await lote(b, 4);
      await cambiar(solicitud.id, 'entregado', rol).expect(200);
      expect((await obtener(solicitud.id)).estado).toBe('entregado');
      expect(
        (
          await prisma.insumo.findUniqueOrThrow({ where: { id: a } })
        ).stock_actual.toNumber(),
      ).toBe(8);
      expect(
        (
          await prisma.insumo.findUniqueOrThrow({ where: { id: b } })
        ).stock_actual.toNumber(),
      ).toBe(0);
    },
  );

  it('no usa stock de lotes inactivos para entregar', async () => {
    const id = await nuevoInsumo('Inactivo');
    await lote(id, 10, 30, false);
    const solicitud = await crear('produccion', [
      { insumo_id: id, cantidad_solicitada: 1 },
    ]);
    await cambiar(solicitud.id, 'en_proceso').expect(200);
    const antes = await snapshot([id]);
    await cambiar(solicitud.id, 'entregado').expect(409);
    expect(await snapshot([id])).toEqual(antes);
    expect((await obtener(solicitud.id)).estado).toBe('en_proceso');
  });

  const invalidos: Record<string, unknown>[] = [
    { codigo_solicitud: '' },
    { codigo_solicitud: 'x'.repeat(51) },
    { codigo_solicitud: 7 },
    { detalle: [] },
    { detalle: null },
    { detalle: [{}] },
    { detalle: [{ insumo_id: 0, cantidad_solicitada: 1 }] },
    { detalle: [{ insumo_id: 1, cantidad_solicitada: 0 }] },
    { detalle: [{ insumo_id: 1, cantidad_solicitada: -1 }] },
    { detalle: [{ insumo_id: 1, cantidad_solicitada: 1.001 }] },
    { solicitud_produccion_id: 0 },
    { solicitud_produccion_id: 'abc' },
    { fecha_limite: '2026-02-30' },
    { estado: 'entregado' },
    { solicitado_por: 'otro' },
  ];
  it.each(invalidos)(
    'valida el POST sin efectos parciales: %j',
    async (cambios) => {
      const antes = await prisma.solicitudInsumosDetalle.count();
      const codigoSolicitud = codigo();
      await http()
        .post(URL)
        .set(auth())
        .send({
          codigo_solicitud: codigoSolicitud,
          detalle: [linea()],
          ...cambios,
        })
        .expect(400);
      expect(
        await prisma.solicitudInsumos.findUnique({
          where: { codigo_solicitud: codigoSolicitud },
        }),
      ).toBeNull();
      expect(await prisma.solicitudInsumosDetalle.count()).toBe(antes);
    },
  );

  it.each([
    {},
    { cantidad_solicitada: 0 },
    { cantidad_solicitada: -1 },
    { cantidad_solicitada: 1.001 },
    { cantidad_solicitada: 1, insumo_id: 2 },
  ])(
    'valida cantidad/whitelist al editar y agregar detalle: %j',
    async (body) => {
      const solicitud = await crear();
      const antes = (await obtener(solicitud.id)).detalle;
      await http()
        .patch(`${URL}/detalle/${antes[0].id}`)
        .set(auth())
        .send(body)
        .expect(400);
      if (!('insumo_id' in body))
        await http()
          .post(`${URL}/${solicitud.id}/detalle`)
          .set(auth())
          .send({ insumo_id: insumos[1], ...body })
          .expect(400);
      expect((await obtener(solicitud.id)).detalle).toEqual(antes);
    },
  );

  it.each([{}, { estado: 'cancelado' }, { estado: '' }])(
    'valida el estado recibido: %j',
    async (body) => {
      const solicitud = await crear();
      await http()
        .patch(`${URL}/${solicitud.id}/estado`)
        .set(auth('inventario'))
        .send(body)
        .expect(400);
      expect((await obtener(solicitud.id)).estado).toBe('pendiente');
    },
  );

  it.each([
    { page: 0 },
    { limit: 101 },
    { estado: 'cancelado' },
    { solicitud_produccion_id: -1 },
    { fecha_desde: 'ayer' },
    { fecha_hasta: '2026-02-30' },
    { fecha_desde: '2026-11-04T00:00:00Z' },
  ])('valida filtros: %j', async (query) => {
    await http().get(URL).set(auth()).query(query).expect(400);
  });
  it.each([{}, { fecha_limite: 'ayer' }, { fecha_limite: '2026-02-30' }])(
    'valida fecha límite: %j',
    async (body) => {
      const solicitud = await crear();
      await http()
        .patch(`${URL}/${solicitud.id}`)
        .set(auth())
        .send(body)
        .expect(400);
    },
  );
  it.each(['abc', '1.5'])('rechaza id no entero %s', async (id) => {
    await http().get(`${URL}/${id}`).set(auth()).expect(400);
    await http()
      .patch(`${URL}/detalle/${id}`)
      .set(auth())
      .send({ cantidad_solicitada: 1 })
      .expect(400);
    await http().delete(`${URL}/detalle/${id}`).set(auth()).expect(400);
  });
});
