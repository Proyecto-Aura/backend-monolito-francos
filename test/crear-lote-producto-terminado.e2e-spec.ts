import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';

const MARCA = 'E2E263';
const URL = '/api/v1/lotes-producto-terminado';
const ROLES = [
  'admin',
  'produccion',
  'inventario',
  'ventas',
  'cliente',
] as const;
type Rol = (typeof ROLES)[number];
interface LoteHttp {
  id: number;
  producto_terminado_id: number;
  codigo_lote: string;
  fecha_produccion: string;
  fecha_vencimiento: string | null;
  cantidad_inicial: number;
  cantidad_actual: number;
  estado: string;
  activo: boolean;
  solicitud_produccion_id: number | null;
}

describe('Registrar lote de producto terminado OFT0-263 (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const tokens = {} as Record<Rol, string>;
  const productos: number[] = [];
  let secuencia = 0;
  const http = () => request(app.getHttpServer());
  const auth = (rol: Rol = 'produccion') => ({
    Authorization: `Bearer ${tokens[rol]}`,
  });
  const body = () => ({
    producto_terminado_id: productos[0],
    codigo_lote: `${MARCA}-${++secuencia}`,
    fecha_produccion: '2026-11-01',
    cantidad_inicial: 100,
  });
  const stockDe = async (id = productos[0]) =>
    (
      await prisma.productoTerminado.findUniqueOrThrow({ where: { id } })
    ).stock_actual.toNumber();
  const snapshot = async () => ({
    productos: await prisma.productoTerminado.findMany({
      where: { id: { in: productos } },
      orderBy: { id: 'asc' },
    }),
    lotes: await prisma.loteProductoTerminado.findMany({
      where: { codigo_lote: { startsWith: MARCA } },
      orderBy: { id: 'asc' },
    }),
    movimientos: await prisma.movimientoProductoTerminado.findMany({
      where: {
        lote_producto_terminado: { codigo_lote: { startsWith: MARCA } },
      },
      orderBy: { id: 'asc' },
    }),
  });

  const limpiar = async () => {
    const filtro = {
      producto_terminado: {
        producto_presentacion: { producto: { nombre: MARCA } },
      },
    };
    await prisma.movimientoProductoTerminado.deleteMany({
      where: { lote_producto_terminado: filtro },
    });
    await prisma.loteProductoTerminado.deleteMany({ where: filtro });
    await prisma.solicitudProduccionDetalle.deleteMany({
      where: { solicitud_produccion: { codigo: { startsWith: MARCA } } },
    });
    await prisma.solicitudProduccion.deleteMany({
      where: { codigo: { startsWith: MARCA } },
    });
    await prisma.productoTerminado.deleteMany({
      where: { producto_presentacion: { producto: { nombre: MARCA } } },
    });
    await prisma.productoPresentacion.deleteMany({
      where: { producto: { nombre: MARCA } },
    });
    await prisma.producto.deleteMany({ where: { nombre: MARCA } });
    await prisma.presentacion.deleteMany({ where: { descripcion: MARCA } });
    await prisma.categoria.deleteMany({ where: { nombre: MARCA } });
    for (const rol of ROLES) {
      const user = await prisma.user.findUnique({
        where: { username: `e2e-oft263-${rol}` },
      });
      if (!user) continue;
      await prisma.refreshToken.deleteMany({ where: { user_id: user.id } });
      await prisma.usuarioRol.deleteMany({ where: { user_id: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.persona.delete({ where: { id: user.persona_id } });
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
    const password = 'Test263!';
    const contrasena = await hashPassword(password);
    for (const [i, rol] of ROLES.entries()) {
      const persona = await prisma.persona.create({
        data: {
          nombres: MARCA,
          apellido_paterno: rol,
          apellido_materno: 'Prueba',
          tipo_documento: 'dni',
          numero_documento: `9926300${i}`,
        },
      });
      const user = await prisma.user.create({
        data: {
          persona_id: persona.id,
          username: `e2e-oft263-${rol}`,
          email: `e2e-oft263-${rol}@francos.test`,
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
    const categoria = await prisma.categoria.create({
      data: { nombre: MARCA },
    });
    const producto = await prisma.producto.create({
      data: { nombre: MARCA, categoria_id: categoria.id },
    });
    for (let i = 0; i < 2; i++) {
      const presentacion = await prisma.presentacion.create({
        data: { cantidad: 26310 + i, unidad_medida: 'gr', descripcion: MARCA },
      });
      const pp = await prisma.productoPresentacion.create({
        data: {
          producto_id: producto.id,
          presentacion_id: presentacion.id,
          sku: `${MARCA}-${i}`,
          precio_unitario: 10,
          estado: i === 0,
        },
      });
      productos.push(
        (
          await prisma.productoTerminado.create({
            data: { producto_presentacion_id: pp.id },
          })
        ).id,
      );
    }
  }, 60000);

  afterAll(async () => {
    try {
      if (prisma) await limpiar();
    } finally {
      if (app) await app.close();
    }
  }, 60000);

  it('sin token devuelve 401 sin crear lotes ni movimientos', async () => {
    const antes = await snapshot();
    await http().post(URL).send(body()).expect(401);
    expect(await snapshot()).toEqual(antes);
  });

  it.each(['inventario', 'ventas', 'cliente'] as const)(
    '%s no puede registrar lotes',
    async (rol) => {
      const antes = await snapshot();
      await http().post(URL).set(auth(rol)).send(body()).expect(403);
      expect(await snapshot()).toEqual(antes);
    },
  );

  it.each(['admin', 'produccion'] as const)(
    '%s crea el lote mediante una sola entrada sin duplicar el saldo',
    async (rol) => {
      const datos = body();
      const stockAnterior = await stockDe();
      const res = await http().post(URL).set(auth(rol)).send(datos).expect(201);
      const lote = res.body as LoteHttp;
      expect(lote).toMatchObject({
        producto_terminado_id: productos[0],
        codigo_lote: datos.codigo_lote,
        cantidad_inicial: 100,
        cantidad_actual: 100,
        estado: 'activo',
        activo: true,
        fecha_produccion: '2026-11-01T00:00:00.000Z',
        fecha_vencimiento: null,
        producto_nombre: MARCA,
        sku: `${MARCA}-0`,
      });
      const movimientos = await prisma.movimientoProductoTerminado.findMany({
        where: { lote_producto_terminado_id: lote.id },
      });
      expect(movimientos).toHaveLength(1);
      expect(movimientos[0]).toMatchObject({
        tipo: 'entrada',
        razon: 'Producción inicial de lote',
      });
      expect(movimientos[0].cantidad.toNumber()).toBe(100);
      expect(movimientos[0].stock_anterior.toNumber()).toBe(0);
      expect(movimientos[0].stock_resultante.toNumber()).toBe(100);
      const persistido = await prisma.loteProductoTerminado.findUniqueOrThrow({
        where: { id: lote.id },
      });
      expect(persistido.cantidad_actual.toNumber()).toBe(100);
      expect(await stockDe()).toBe(stockAnterior + 100);
      for (const lector of ['admin', 'inventario', 'produccion'] as const) {
        const leido = await http()
          .get(`${URL}/${lote.id}`)
          .set(auth(lector))
          .expect(200);
        expect(leido.body).toEqual(lote);
        const lista = await http()
          .get(URL)
          .set(auth(lector))
          .query({ search: datos.codigo_lote })
          .expect(200);
        expect(
          (lista.body as { data: LoteHttp[] }).data.map((l) => l.id),
        ).toContain(lote.id);
      }
    },
  );

  it('vincula el lote a una solicitud existente y conserva el vínculo al leerlo', async () => {
    const solicitudRes = await http()
      .post('/api/v1/solicitudes-produccion')
      .set(auth('admin'))
      .send({
        codigo: `${MARCA}-SOL-${++secuencia}`,
        detalle: [
          { producto_terminado_id: productos[0], cantidad_solicitada: 100 },
        ],
      })
      .expect(201);
    const solicitud = solicitudRes.body as { id: number };
    const res = await http()
      .post(URL)
      .set(auth())
      .send({ ...body(), solicitud_produccion_id: solicitud.id })
      .expect(201);
    const lote = res.body as LoteHttp;
    expect(lote.solicitud_produccion_id).toBe(solicitud.id);
    const persistido = await prisma.loteProductoTerminado.findUniqueOrThrow({
      where: { id: lote.id },
    });
    expect(persistido.solicitud_produccion_id).toBe(solicitud.id);
    const leido = await http().get(`${URL}/${lote.id}`).set(auth()).expect(200);
    expect(leido.body).toMatchObject({
      id: lote.id,
      solicitud_produccion_id: solicitud.id,
    });
  });

  it('solicitud inexistente devuelve 404 sin crear lote, entrada ni alterar stock', async () => {
    const antes = await snapshot();
    await http()
      .post(URL)
      .set(auth())
      .send({ ...body(), solicitud_produccion_id: 2147483647 })
      .expect(404);
    expect(await snapshot()).toEqual(antes);
  });

  it('respeta fecha de vencimiento, cantidad decimal y razón personalizada', async () => {
    const stockAnterior = await stockDe();
    const datos = {
      ...body(),
      fecha_vencimiento: '2030-11-01',
      cantidad_inicial: 12.5,
      razon: 'Producción manual OFT0-263',
    };
    const res = await http().post(URL).set(auth()).send(datos).expect(201);
    const lote = res.body as LoteHttp;
    expect(lote).toMatchObject({
      cantidad_inicial: 12.5,
      cantidad_actual: 12.5,
      fecha_vencimiento: '2030-11-01T00:00:00.000Z',
    });
    const movimiento =
      await prisma.movimientoProductoTerminado.findFirstOrThrow({
        where: { lote_producto_terminado_id: lote.id },
      });
    expect(movimiento.razon).toBe(datos.razon);
    expect(movimiento.cantidad.toNumber()).toBe(12.5);
    expect(await stockDe()).toBe(stockAnterior + 12.5);
  });

  it('permite crear inactivo sin sumarlo al stock disponible del producto', async () => {
    const stockAnterior = await stockDe();
    const res = await http()
      .post(URL)
      .set(auth())
      .send({ ...body(), activo: false })
      .expect(201);
    expect(res.body).toMatchObject({ activo: false, cantidad_actual: 100 });
    expect(await stockDe()).toBe(stockAnterior);
    expect(
      await prisma.movimientoProductoTerminado.count({
        where: { lote_producto_terminado_id: (res.body as LoteHttp).id },
      }),
    ).toBe(1);
  });

  it('acepta producción y vencimiento el mismo día', async () => {
    await http()
      .post(URL)
      .set(auth())
      .send({
        ...body(),
        fecha_produccion: '2030-11-01',
        fecha_vencimiento: '2030-11-01',
      })
      .expect(201);
  });

  it.each(['igual', 'minúsculas', 'espacios'] as const)(
    'rechaza código duplicado con variante %s sin sumar stock ni crear otra entrada',
    async (variante) => {
      const datos = body();
      await http().post(URL).set(auth()).send(datos).expect(201);
      const antes = await snapshot();
      const codigo_lote =
        variante === 'minúsculas'
          ? datos.codigo_lote.toLowerCase()
          : variante === 'espacios'
            ? `  ${datos.codigo_lote}  `
            : datos.codigo_lote;
      await http()
        .post(URL)
        .set(auth())
        .send({ ...datos, codigo_lote })
        .expect(409);
      expect(await snapshot()).toEqual(antes);
    },
  );

  it.each([
    {
      nombre: 'producto inexistente',
      status: 404,
      cambios: { producto_terminado_id: 2147483647 },
    },
    {
      nombre: 'vencimiento anterior a producción',
      status: 409,
      cambios: { fecha_vencimiento: '2026-10-31' },
    },
  ])('rechaza $nombre sin efectos parciales', async ({ status, cambios }) => {
    const antes = await snapshot();
    await http()
      .post(URL)
      .set(auth())
      .send({ ...body(), ...cambios })
      .expect(status);
    expect(await snapshot()).toEqual(antes);
  });

  it('rechaza producto terminado inactivo con 409', async () => {
    const antes = await snapshot();
    await http()
      .post(URL)
      .set(auth())
      .send({ ...body(), producto_terminado_id: productos[1] })
      .expect(409);
    expect(await snapshot()).toEqual(antes);
  });

  it('normaliza el código al persistir y admite la cantidad cero permitida por el DTO', async () => {
    const codigo = `${MARCA} lote ${++secuencia}`;
    const stockAnterior = await stockDe();
    const res = await http()
      .post(URL)
      .set(auth())
      .send({
        ...body(),
        codigo_lote: `  ${MARCA}   lote  ${secuencia - 1}  `,
        cantidad_inicial: 0,
      })
      .expect(201);
    expect(res.body).toMatchObject({
      codigo_lote: codigo,
      cantidad_inicial: 0,
      cantidad_actual: 0,
    });
    expect(await stockDe()).toBe(stockAnterior);
  });

  it.each([
    {
      nombre: 'producto ausente',
      cambios: { producto_terminado_id: undefined },
    },
    { nombre: 'producto cero', cambios: { producto_terminado_id: 0 } },
    { nombre: 'código vacío', cambios: { codigo_lote: '' } },
    { nombre: 'código largo', cambios: { codigo_lote: 'x'.repeat(51) } },
    { nombre: 'producción ausente', cambios: { fecha_produccion: undefined } },
    {
      nombre: 'producción inválida',
      cambios: { fecha_produccion: '2026-02-30' },
    },
    {
      nombre: 'producción con hora',
      cambios: { fecha_produccion: '2026-11-01T00:00:00Z' },
    },
    {
      nombre: 'vencimiento inválido',
      cambios: { fecha_vencimiento: '2026-13-01' },
    },
    { nombre: 'cantidad ausente', cambios: { cantidad_inicial: undefined } },
    { nombre: 'cantidad negativa', cambios: { cantidad_inicial: -1 } },
    {
      nombre: 'cantidad con tres decimales',
      cambios: { cantidad_inicial: 1.001 },
    },
    { nombre: 'cantidad no numérica', cambios: { cantidad_inicial: 'abc' } },
    { nombre: 'activo inválido', cambios: { activo: 'no' } },
    { nombre: 'razón larga', cambios: { razon: 'x'.repeat(256) } },
    {
      nombre: 'saldo impuesto por el cliente',
      cambios: { cantidad_actual: 999 },
    },
  ])('valida $nombre con 400 sin efectos parciales', async ({ cambios }) => {
    const antes = await snapshot();
    await http()
      .post(URL)
      .set(auth())
      .send({ ...body(), ...cambios })
      .expect(400);
    expect(await snapshot()).toEqual(antes);
  });
});
