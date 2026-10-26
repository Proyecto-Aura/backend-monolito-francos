import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

// HU gestionar lotes de producto terminado (OFT0-259). A diferencia de
// lotes de insumo, acá NO hay create/baja propios: los lotes nacen vía seed
// o (más adelante) desde producción (ver LoteProductoTerminadoRepository),
// así que este e2e crea sus fixtures directo por Prisma y solo cubre
// lectura (GET list + GET :id).
const MARCA = 'E2E OFT0-259-L';
const CATEGORIAS_URL = '/api/v1/categorias';
const PRESENTACIONES_URL = '/api/v1/presentaciones';
const PRODUCTOS_URL = '/api/v1/productos';
const LOTES_URL = '/api/v1/lotes-producto-terminado';

interface ProductoPresentacionHttp {
  id: number;
}

interface ProductoHttp {
  id: number;
  producto_presentaciones: ProductoPresentacionHttp[];
}

interface LoteHttp {
  id: number;
  producto_terminado_id: number;
  codigo_lote: string;
  fecha_vencimiento: string | null;
  cantidad_inicial: number;
  cantidad_actual: number;
  estado: string;
  activo: boolean;
}

const TEST_USERS = {
  inventario: {
    identificador: 'e2e-inventario-oft259l',
    password: 'InventarioE2e123',
    email: 'e2e-inventario-oft259l@francos.test',
    documento: '99999870',
    rol: 'inventario',
  },
  produccion: {
    identificador: 'e2e-produccion-oft259l',
    password: 'ProduccionE2e123',
    email: 'e2e-produccion-oft259l@francos.test',
    documento: '99999871',
    rol: 'produccion',
  },
  ventas: {
    identificador: 'e2e-ventas-oft259l',
    password: 'VentasE2e123',
    email: 'e2e-ventas-oft259l@francos.test',
    documento: '99999872',
    rol: 'ventas',
  },
} as const;

// Fechas relativas a "hoy" para no depender de la fecha exacta en la que
// corran los tests (DIAS_POR_VENCER = 15, ver lote-insumo.mapper).
const fechaEnDias = (dias: number): string => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
};

describe('Lotes de producto terminado (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let inventarioToken: string;
  let produccionToken: string;
  let ventasToken: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const login = async (identificador: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador, password });
    expect([200, 201]).toContain(res.status);
    return (res.body as { access_token: string }).access_token;
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
        apellido_materno: 'OFT0-259 E2E',
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

  const deleteTestUsers = async () => {
    for (const testUser of Object.values(TEST_USERS)) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ username: testUser.identificador }, { email: testUser.email }],
        },
        select: { id: true, persona_id: true },
      });
      if (user) {
        await prisma.$transaction([
          prisma.refreshToken.deleteMany({ where: { user_id: user.id } }),
          prisma.usuarioRol.deleteMany({ where: { user_id: user.id } }),
          prisma.user.delete({ where: { id: user.id } }),
          prisma.persona.delete({ where: { id: user.persona_id } }),
        ]);
      } else {
        await prisma.persona.deleteMany({
          where: { numero_documento: testUser.documento },
        });
      }
    }
  };

  const limpiarDatos = async () => {
    const productos = await prisma.producto.findMany({
      where: { nombre: { startsWith: MARCA } },
      select: { id: true },
    });

    await prisma.movimientoProductoTerminado.deleteMany({
      where: {
        lote_producto_terminado: { codigo_lote: { startsWith: MARCA } },
      },
    });
    await prisma.loteProductoTerminado.deleteMany({
      where: { codigo_lote: { startsWith: MARCA } },
    });
    await prisma.productoTerminado.deleteMany({
      where: {
        producto_presentacion: {
          producto_id: { in: productos.map((p) => p.id) },
        },
      },
    });
    await prisma.productoPresentacion.deleteMany({
      where: { producto_id: { in: productos.map((p) => p.id) } },
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
  };

  // Cada presentación es única por (cantidad, unidad_medida) -no por
  // descripción-, así que cada fixture necesita su propia cantidad.
  let siguienteCantidadPresentacion = 9300;

  // Crea categoría + presentación + producto (vía API de catálogo, igual que
  // productos-terminados.e2e-spec.ts) y devuelve el id propio de
  // producto_terminado (no el de producto_presentacion).
  const crearProductoTerminado = async (
    sufijo: string,
  ): Promise<{
    productoTerminadoId: number;
    productoPresentacionId: number;
  }> => {
    const categoria = (
      await request(app.getHttpServer())
        .post(CATEGORIAS_URL)
        .set(auth(adminToken))
        .send({ nombre: `${MARCA} Categoría ${sufijo}` })
        .expect(201)
    ).body as { id: number };

    const presentacion = (
      await request(app.getHttpServer())
        .post(PRESENTACIONES_URL)
        .set(auth(adminToken))
        .send({
          cantidad: siguienteCantidadPresentacion++,
          unidad_medida: 'gr',
          descripcion: `${MARCA} Presentación ${sufijo}`,
        })
        .expect(201)
    ).body as { id: number };

    const producto = (
      await request(app.getHttpServer())
        .post(PRODUCTOS_URL)
        .set(auth(adminToken))
        .send({
          categoria_id: categoria.id,
          nombre: `${MARCA} Producto ${sufijo}`,
          destacado: false,
          producto_presentaciones: [
            { presentacion_id: presentacion.id, precio_unitario: 10 },
          ],
        })
        .expect(201)
    ).body as ProductoHttp;
    const productoPresentacionId = producto.producto_presentaciones[0].id;

    const productoTerminado = await prisma.productoTerminado.findUniqueOrThrow({
      where: { producto_presentacion_id: productoPresentacionId },
    });

    return {
      productoTerminadoId: productoTerminado.id,
      productoPresentacionId,
    };
  };

  // Crea un lote directo por Prisma (no hay endpoint para esto): el trigger
  // de recálculo de stock se dispara igual, porque reacciona a cualquier
  // INSERT en la tabla, sin importar el cliente que lo origine.
  const crearLote = async (datos: {
    producto_terminado_id: number;
    codigo_lote: string;
    fecha_vencimiento?: string | null;
    cantidad: number;
    activo?: boolean;
  }) =>
    prisma.loteProductoTerminado.create({
      data: {
        producto_terminado_id: datos.producto_terminado_id,
        codigo_lote: datos.codigo_lote,
        fecha_produccion: new Date('2026-10-01T00:00:00.000Z'),
        fecha_vencimiento: datos.fecha_vencimiento
          ? new Date(`${datos.fecha_vencimiento}T00:00:00.000Z`)
          : null,
        cantidad_inicial: datos.cantidad,
        cantidad_actual: datos.cantidad,
        activo: datos.activo ?? true,
      },
    });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    await limpiarDatos();
    await deleteTestUsers();
    for (const testUser of Object.values(TEST_USERS)) {
      await createTestUser(testUser);
    }

    adminToken = await login('admin', 'admin123');
    inventarioToken = await login(
      TEST_USERS.inventario.identificador,
      TEST_USERS.inventario.password,
    );
    produccionToken = await login(
      TEST_USERS.produccion.identificador,
      TEST_USERS.produccion.password,
    );
    ventasToken = await login(
      TEST_USERS.ventas.identificador,
      TEST_USERS.ventas.password,
    );
  });

  afterAll(async () => {
    await limpiarDatos();
    await deleteTestUsers();
    await app.close();
  });

  it('GET sin token devuelve 401, rol ventas devuelve 403 y roles inventario/produccion devuelven 200', async () => {
    await request(app.getHttpServer()).get(LOTES_URL).expect(401);
    await request(app.getHttpServer())
      .get(LOTES_URL)
      .set(auth(ventasToken))
      .expect(403);
    await request(app.getHttpServer())
      .get(LOTES_URL)
      .set(auth(inventarioToken))
      .query({ search: MARCA, limit: 100 })
      .expect(200);
    await request(app.getHttpServer())
      .get(LOTES_URL)
      .set(auth(produccionToken))
      .query({ search: MARCA, limit: 100 })
      .expect(200);
  });

  it('deriva vencido/por_vencer/activo al leer (no persistido) y filtra por estado sin pisarse', async () => {
    const { productoTerminadoId } = await crearProductoTerminado('estado');

    const vencido = await crearLote({
      producto_terminado_id: productoTerminadoId,
      codigo_lote: `${MARCA}-vencido`,
      fecha_vencimiento: fechaEnDias(-10),
      cantidad: 10,
    });
    const porVencer = await crearLote({
      producto_terminado_id: productoTerminadoId,
      codigo_lote: `${MARCA}-por-vencer`,
      fecha_vencimiento: fechaEnDias(10),
      cantidad: 10,
    });
    const activo = await crearLote({
      producto_terminado_id: productoTerminadoId,
      codigo_lote: `${MARCA}-activo`,
      fecha_vencimiento: fechaEnDias(200),
      cantidad: 10,
    });
    const sinVencimiento = await crearLote({
      producto_terminado_id: productoTerminadoId,
      codigo_lote: `${MARCA}-sin-vencimiento`,
      cantidad: 10,
    });

    const leer = async (id: number) =>
      (
        await request(app.getHttpServer())
          .get(`${LOTES_URL}/${id}`)
          .set(auth(adminToken))
          .expect(200)
      ).body as LoteHttp;

    expect((await leer(vencido.id)).estado).toBe('vencido');
    expect((await leer(porVencer.id)).estado).toBe('por_vencer');
    expect((await leer(activo.id)).estado).toBe('activo');
    expect((await leer(sinVencimiento.id)).estado).toBe('activo');

    const idsConEstado = async (estado: string) => {
      const res = await request(app.getHttpServer())
        .get(LOTES_URL)
        .query({
          producto_terminado_id: productoTerminadoId,
          estado,
          limit: 100,
        })
        .set(auth(adminToken))
        .expect(200);
      return (res.body as { data: LoteHttp[] }).data.map((l) => l.id);
    };

    // El filtro estado=activo no debe traer los que muestran
    // vencido/por_vencer, aunque la columna real diga 'activo' en los tres.
    expect(await idsConEstado('activo')).toEqual(
      expect.arrayContaining([activo.id, sinVencimiento.id]),
    );
    expect(await idsConEstado('activo')).not.toEqual(
      expect.arrayContaining([vencido.id, porVencer.id]),
    );
    expect(await idsConEstado('vencido')).toEqual([vencido.id]);
    expect(await idsConEstado('por_vencer')).toEqual([porVencer.id]);
  });

  it('filtra por rango de fecha de vencimiento (vence_desde/vence_hasta)', async () => {
    const { productoTerminadoId } = await crearProductoTerminado('rango');

    const dentro = await crearLote({
      producto_terminado_id: productoTerminadoId,
      codigo_lote: `${MARCA}-rango-dentro`,
      fecha_vencimiento: fechaEnDias(20),
      cantidad: 10,
    });
    await crearLote({
      producto_terminado_id: productoTerminadoId,
      codigo_lote: `${MARCA}-rango-fuera`,
      fecha_vencimiento: fechaEnDias(200),
      cantidad: 10,
    });

    const res = await request(app.getHttpServer())
      .get(LOTES_URL)
      .query({
        producto_terminado_id: productoTerminadoId,
        vence_desde: fechaEnDias(15),
        vence_hasta: fechaEnDias(25),
        limit: 100,
      })
      .set(auth(adminToken))
      .expect(200);

    expect((res.body as { data: LoteHttp[] }).data.map((l) => l.id)).toEqual([
      dentro.id,
    ]);
  });

  it('ordena el listado por fecha de vencimiento más próxima primero (sin fecha al final)', async () => {
    const { productoTerminadoId } = await crearProductoTerminado('orden');

    const lejano = await crearLote({
      producto_terminado_id: productoTerminadoId,
      codigo_lote: `${MARCA}-orden-lejano`,
      fecha_vencimiento: fechaEnDias(300),
      cantidad: 10,
    });
    const cercano = await crearLote({
      producto_terminado_id: productoTerminadoId,
      codigo_lote: `${MARCA}-orden-cercano`,
      fecha_vencimiento: fechaEnDias(5),
      cantidad: 10,
    });
    const sinVencimiento = await crearLote({
      producto_terminado_id: productoTerminadoId,
      codigo_lote: `${MARCA}-orden-sin-vencimiento`,
      cantidad: 10,
    });

    const res = await request(app.getHttpServer())
      .get(LOTES_URL)
      .query({ producto_terminado_id: productoTerminadoId, limit: 100 })
      .set(auth(adminToken))
      .expect(200);

    expect((res.body as { data: LoteHttp[] }).data.map((l) => l.id)).toEqual([
      cercano.id,
      lejano.id,
      sinVencimiento.id,
    ]);
  });

  it('filtra por activo (baja lógica, aunque no haya endpoint para darla de baja)', async () => {
    const { productoTerminadoId } =
      await crearProductoTerminado('activo-filtro');

    const activo = await crearLote({
      producto_terminado_id: productoTerminadoId,
      codigo_lote: `${MARCA}-activo-si`,
      cantidad: 10,
    });
    const inactivo = await crearLote({
      producto_terminado_id: productoTerminadoId,
      codigo_lote: `${MARCA}-activo-no`,
      cantidad: 10,
      activo: false,
    });

    const soloActivos = await request(app.getHttpServer())
      .get(LOTES_URL)
      .query({
        producto_terminado_id: productoTerminadoId,
        activo: true,
        limit: 100,
      })
      .set(auth(adminToken))
      .expect(200);
    expect(
      (soloActivos.body as { data: LoteHttp[] }).data.map((l) => l.id),
    ).toEqual([activo.id]);

    const soloInactivos = await request(app.getHttpServer())
      .get(LOTES_URL)
      .query({
        producto_terminado_id: productoTerminadoId,
        activo: false,
        limit: 100,
      })
      .set(auth(adminToken))
      .expect(200);
    expect(
      (soloInactivos.body as { data: LoteHttp[] }).data.map((l) => l.id),
    ).toEqual([inactivo.id]);
  });

  it('filtra por search (sku, nombre de producto o código de lote)', async () => {
    const { productoTerminadoId, productoPresentacionId } =
      await crearProductoTerminado('search');
    const lote = await crearLote({
      producto_terminado_id: productoTerminadoId,
      codigo_lote: `${MARCA}-search-unico`,
      cantidad: 10,
    });

    const sku = (
      await prisma.productoPresentacion.findUniqueOrThrow({
        where: { id: productoPresentacionId },
        select: { sku: true },
      })
    ).sku;

    const porSku = await request(app.getHttpServer())
      .get(LOTES_URL)
      .query({ search: sku, limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    expect((porSku.body as { data: LoteHttp[] }).data.map((l) => l.id)).toEqual(
      [lote.id],
    );

    const porCodigo = await request(app.getHttpServer())
      .get(LOTES_URL)
      .query({ search: `${MARCA}-search-unico`, limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    expect(
      (porCodigo.body as { data: LoteHttp[] }).data.map((l) => l.id),
    ).toEqual([lote.id]);

    const sinMatch = await request(app.getHttpServer())
      .get(LOTES_URL)
      .query({ search: 'Ingrediente que no existe', limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    expect(
      (sinMatch.body as { data: LoteHttp[] }).data.some(
        (l) => l.id === lote.id,
      ),
    ).toBe(false);
  });

  it('GET :id devuelve 404 si el lote no existe', async () => {
    await request(app.getHttpServer())
      .get(`${LOTES_URL}/999999`)
      .set(auth(adminToken))
      .expect(404);
  });
});
