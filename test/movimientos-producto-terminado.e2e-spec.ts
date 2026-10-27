import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

// HU gestionar movimientos de producto terminado / kardex (OFT0-259). Mismo
// patrón que movimientos de insumo: entrada (manual sobre lote existente),
// salida (reparto FEFO entre lotes) y ajuste (cantidad firmada). A
// diferencia de insumo, acá no hay endpoint para crear lotes (ver
// LoteProductoTerminadoRepository): los fixtures de lote se crean directo
// por Prisma, igual que lo haría el seed o (más adelante) producción.
const MARCA = 'E2E OFT0-259-M';
const CATEGORIAS_URL = '/api/v1/categorias';
const PRESENTACIONES_URL = '/api/v1/presentaciones';
const PRODUCTOS_URL = '/api/v1/productos';
const LOTES_URL = '/api/v1/lotes-producto-terminado';
const MOVIMIENTOS_URL = '/api/v1/movimientos-producto-terminado';

interface ProductoPresentacionHttp {
  id: number;
}

interface ProductoHttp {
  id: number;
  producto_presentaciones: ProductoPresentacionHttp[];
}

interface LoteHttp {
  id: number;
  cantidad_actual: number;
  estado: string;
}

interface MovimientoHttp {
  id: number;
  lote_producto_terminado_id: number;
  tipo: string;
  cantidad: number;
  stock_anterior: number;
  stock_resultante: number;
}

const TEST_USERS = {
  inventario: {
    identificador: 'e2e-inventario-oft259m',
    password: 'InventarioE2e123',
    email: 'e2e-inventario-oft259m@francos.test',
    documento: '99999880',
    rol: 'inventario',
  },
  ventas: {
    identificador: 'e2e-ventas-oft259m',
    password: 'VentasE2e123',
    email: 'e2e-ventas-oft259m@francos.test',
    documento: '99999881',
    rol: 'ventas',
  },
} as const;

const fechaEnDias = (dias: number): string => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
};

describe('Movimientos de producto terminado (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let inventarioToken: string;
  let ventasToken: string;
  let productoTerminadoId: number;
  let loteCercanoId: number;
  let loteLejanoId: number;

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
    const productosTerminados = await prisma.productoTerminado.findMany({
      where: {
        producto_presentacion: {
          producto_id: { in: productos.map((p) => p.id) },
        },
      },
      select: { id: true },
    });

    await prisma.movimientoProductoTerminado.deleteMany({
      where: {
        lote_producto_terminado: { codigo_lote: { startsWith: MARCA } },
      },
    });
    // El contador de correlativo (producto_terminado_id + fecha) no se borra
    // solo con el producto: se limpia aparte para no dejar filas huérfanas.
    await prisma.movimientoProductoTerminadoCorrelativo.deleteMany({
      where: {
        producto_terminado_id: { in: productosTerminados.map((p) => p.id) },
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
  let siguienteCantidadPresentacion = 9400;

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
            {
              presentacion_id: presentacion.id,
              precio_unitario: 10,
              // Las presentaciones nuevas nacen desactivadas (HU-A-008); la
              // salida valida producto_terminado.estado (ver
              // RegistrarSalidaProductoTerminadoUseCase), así que acá se
              // necesitan activas.
              estado: true,
            },
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

  const crearLote = async (datos: {
    producto_terminado_id: number;
    codigo_lote: string;
    fecha_vencimiento?: string | null;
    cantidad: number;
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
      },
    });

  const stockActualDe = async (id: number) =>
    (
      await prisma.productoTerminado.findUniqueOrThrow({
        where: { id },
        select: { stock_actual: true },
      })
    ).stock_actual.toNumber();

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
    ventasToken = await login(
      TEST_USERS.ventas.identificador,
      TEST_USERS.ventas.password,
    );

    const producto = await crearProductoTerminado('principal');
    productoTerminadoId = producto.productoTerminadoId;

    const loteCercano = await crearLote({
      producto_terminado_id: productoTerminadoId,
      codigo_lote: `${MARCA}-cercano`,
      fecha_vencimiento: fechaEnDias(30),
      cantidad: 60,
    });
    loteCercanoId = loteCercano.id;

    const loteLejano = await crearLote({
      producto_terminado_id: productoTerminadoId,
      codigo_lote: `${MARCA}-lejano`,
      fecha_vencimiento: fechaEnDias(200),
      cantidad: 50,
    });
    loteLejanoId = loteLejano.id;
  });

  afterAll(async () => {
    await limpiarDatos();
    await deleteTestUsers();
    await app.close();
  });

  it('GET sin token devuelve 401 y con rol ventas devuelve 403', async () => {
    await request(app.getHttpServer()).get(MOVIMIENTOS_URL).expect(401);
    await request(app.getHttpServer())
      .get(MOVIMIENTOS_URL)
      .set(auth(ventasToken))
      .expect(403);
  });

  it('POST entrada con rol ventas devuelve 403 y suma al lote existente (201) con rol inventario', async () => {
    await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/entrada`)
      .set(auth(ventasToken))
      .send({
        lote_producto_terminado_id: loteCercanoId,
        cantidad: 15,
        razon: `${MARCA}: no debería aplicarse`,
      })
      .expect(403);

    const res = await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/entrada`)
      .set(auth(inventarioToken))
      .send({
        lote_producto_terminado_id: loteCercanoId,
        cantidad: 15,
        razon: `${MARCA}: segunda hornada del mismo lote`,
      })
      .expect(201);

    const body = res.body as MovimientoHttp;
    expect(body.tipo).toBe('entrada');
    expect(body.stock_anterior).toBe(60);
    expect(body.stock_resultante).toBe(75);
  });

  it('entrada sobre un lote inexistente devuelve 404', async () => {
    await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/entrada`)
      .set(auth(adminToken))
      .send({ lote_producto_terminado_id: 999999, cantidad: 10, razon: MARCA })
      .expect(404);
  });

  it('salida reparte FEFO entre lotes (el que vence antes se agota primero) y marca el lote en 0 como agotado', async () => {
    const res = await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/salida`)
      .set(auth(inventarioToken))
      .send({
        producto_terminado_id: productoTerminadoId,
        cantidad: 90,
        razon: `${MARCA}: salida FEFO`,
      })
      .expect(201);

    const movimientos = res.body as MovimientoHttp[];
    expect(movimientos).toHaveLength(2);
    expect(movimientos[0].lote_producto_terminado_id).toBe(loteCercanoId);
    expect(movimientos[0].cantidad).toBe(75);
    expect(movimientos[0].stock_resultante).toBe(0);
    expect(movimientos[1].lote_producto_terminado_id).toBe(loteLejanoId);
    expect(movimientos[1].cantidad).toBe(15);
    expect(movimientos[1].stock_resultante).toBe(35);

    const loteAgotado = (
      await request(app.getHttpServer())
        .get(`${LOTES_URL}/${loteCercanoId}`)
        .set(auth(adminToken))
        .expect(200)
    ).body as LoteHttp;
    expect(loteAgotado.estado).toBe('agotado');

    expect(await stockActualDe(productoTerminadoId)).toBe(35);
  });

  it('salida (FEFO) nunca reparte un lote vencido, aunque tenga stock', async () => {
    const producto = await crearProductoTerminado('fefo-vencido');

    const loteVencido = await crearLote({
      producto_terminado_id: producto.productoTerminadoId,
      codigo_lote: `${MARCA}-fefo-vencido`,
      fecha_vencimiento: fechaEnDias(-60),
      cantidad: 50,
    });

    const loteValido = await crearLote({
      producto_terminado_id: producto.productoTerminadoId,
      codigo_lote: `${MARCA}-fefo-valido`,
      fecha_vencimiento: fechaEnDias(90),
      cantidad: 30,
    });

    // El vencido "vencería" antes en orden FEFO, pero queda afuera: la
    // salida toma del válido, no del vencido.
    const res = await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/salida`)
      .set(auth(inventarioToken))
      .send({
        producto_terminado_id: producto.productoTerminadoId,
        cantidad: 20,
        razon: `${MARCA}: no debería tocar el lote vencido`,
      })
      .expect(201);

    const movimientos = res.body as MovimientoHttp[];
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].lote_producto_terminado_id).toBe(loteValido.id);

    // Al válido ya le quedan 10 (30 - 20). Pedir 15 más da 409, aunque
    // sumando el vencido (50) alcanzaría de sobra: el vencido no cuenta
    // como disponible.
    await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/salida`)
      .set(auth(inventarioToken))
      .send({
        producto_terminado_id: producto.productoTerminadoId,
        cantidad: 15,
        razon: `${MARCA}: supera lo que queda del válido`,
      })
      .expect(409);

    const loteVencidoLeido = (
      await request(app.getHttpServer())
        .get(`${LOTES_URL}/${loteVencido.id}`)
        .set(auth(adminToken))
        .expect(200)
    ).body as LoteHttp;
    expect(loteVencidoLeido.estado).toBe('vencido');
    expect(loteVencidoLeido.cantidad_actual).toBe(50);
  });

  it('salida sin stock suficiente devuelve 409 y no crea ningún movimiento', async () => {
    const antes = await request(app.getHttpServer())
      .get(MOVIMIENTOS_URL)
      .query({ producto_terminado_id: productoTerminadoId, limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    const totalAntes = (antes.body as { meta: { total: number } }).meta.total;

    await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/salida`)
      .set(auth(adminToken))
      .send({
        producto_terminado_id: productoTerminadoId,
        cantidad: 9999,
        razon: `${MARCA}: no debería aplicarse`,
      })
      .expect(409);

    const despues = await request(app.getHttpServer())
      .get(MOVIMIENTOS_URL)
      .query({ producto_terminado_id: productoTerminadoId, limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    expect((despues.body as { meta: { total: number } }).meta.total).toBe(
      totalAntes,
    );
  });

  it('ajuste con cantidad negativa corrige el lote hacia abajo', async () => {
    const res = await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/ajuste`)
      .set(auth(inventarioToken))
      .send({
        lote_producto_terminado_id: loteLejanoId,
        cantidad: -5,
        razon: `${MARCA}: merma detectada en conteo`,
      })
      .expect(201);

    const body = res.body as MovimientoHttp;
    expect(body.tipo).toBe('ajuste');
    expect(body.stock_anterior).toBe(35);
    expect(body.stock_resultante).toBe(30);
  });

  it('ajuste con cantidad 0 devuelve 409', async () => {
    await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/ajuste`)
      .set(auth(adminToken))
      .send({
        lote_producto_terminado_id: loteLejanoId,
        cantidad: 0,
        razon: `${MARCA}: no debería aplicarse`,
      })
      .expect(409);
  });

  it('ajuste que dejaría el lote en negativo devuelve 409', async () => {
    await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/ajuste`)
      .set(auth(adminToken))
      .send({
        lote_producto_terminado_id: loteLejanoId,
        cantidad: -999,
        razon: `${MARCA}: no debería aplicarse`,
      })
      .expect(409);
  });

  it('GET :id devuelve el movimiento y 404 si no existe', async () => {
    const lista = await request(app.getHttpServer())
      .get(MOVIMIENTOS_URL)
      .query({ producto_terminado_id: productoTerminadoId, limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    const primero = (lista.body as { data: MovimientoHttp[] }).data[0];

    await request(app.getHttpServer())
      .get(`${MOVIMIENTOS_URL}/${primero.id}`)
      .set(auth(adminToken))
      .expect(200);

    await request(app.getHttpServer())
      .get(`${MOVIMIENTOS_URL}/999999`)
      .set(auth(adminToken))
      .expect(404);
  });

  it('filtra por search (nombre o sku del producto, vía lote_producto_terminado.producto_terminado)', async () => {
    const porNombre = await request(app.getHttpServer())
      .get(MOVIMIENTOS_URL)
      .query({ search: `${MARCA} Producto principal`, limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    const dataPorNombre = (porNombre.body as { data: MovimientoHttp[] }).data;
    expect(dataPorNombre.length).toBeGreaterThan(0);

    const sinMatch = await request(app.getHttpServer())
      .get(MOVIMIENTOS_URL)
      .query({ search: 'Ingrediente que no existe', limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    expect((sinMatch.body as { data: MovimientoHttp[] }).data).toHaveLength(0);
  });

  // Batch: varias filas en un mismo POST, en una sola transacción (OFT0-259,
  // mismo pedido del front que en insumos: un form de "Registrar movimiento"
  // con varias líneas). Usan su propio producto/lotes para no depender del
  // estado acumulado de los tests anteriores.
  describe('Batch (array de filas)', () => {
    let loteBatchAId: number;
    let loteBatchBId: number;

    beforeAll(async () => {
      const producto = await crearProductoTerminado('batch');

      const loteA = await crearLote({
        producto_terminado_id: producto.productoTerminadoId,
        codigo_lote: `${MARCA}-batch-a`,
        fecha_vencimiento: fechaEnDias(30),
        cantidad: 40,
      });
      loteBatchAId = loteA.id;

      const loteB = await crearLote({
        producto_terminado_id: producto.productoTerminadoId,
        codigo_lote: `${MARCA}-batch-b`,
        fecha_vencimiento: fechaEnDias(200),
        cantidad: 40,
      });
      loteBatchBId = loteB.id;
    });

    it('entrada con array crea una fila por lote en una sola transacción', async () => {
      const res = await request(app.getHttpServer())
        .post(`${MOVIMIENTOS_URL}/entrada`)
        .set(auth(inventarioToken))
        .send([
          {
            lote_producto_terminado_id: loteBatchAId,
            cantidad: 10,
            razon: `${MARCA}: fila 1`,
          },
          {
            lote_producto_terminado_id: loteBatchBId,
            cantidad: 15,
            razon: `${MARCA}: fila 2`,
          },
        ])
        .expect(201);

      const movimientos = res.body as MovimientoHttp[];
      expect(movimientos).toHaveLength(2);
      expect(movimientos[0].lote_producto_terminado_id).toBe(loteBatchAId);
      expect(movimientos[0].stock_resultante).toBe(50);
      expect(movimientos[1].lote_producto_terminado_id).toBe(loteBatchBId);
      expect(movimientos[1].stock_resultante).toBe(55);
    });

    it('entrada con array no crea nada si una fila es inválida (todo o nada)', async () => {
      await request(app.getHttpServer())
        .post(`${MOVIMIENTOS_URL}/entrada`)
        .set(auth(inventarioToken))
        .send([
          {
            lote_producto_terminado_id: loteBatchAId,
            cantidad: 5,
            razon: `${MARCA}: no debería aplicarse`,
          },
          {
            lote_producto_terminado_id: 999999,
            cantidad: 5,
            razon: `${MARCA}: lote inexistente`,
          },
        ])
        .expect(404);

      const lote = (
        await request(app.getHttpServer())
          .get(`${LOTES_URL}/${loteBatchAId}`)
          .set(auth(adminToken))
          .expect(200)
      ).body as LoteHttp;
      // Sigue en 50 (de la fila anterior): la fila válida del batch fallido
      // no se guardó.
      expect(lote.cantidad_actual).toBe(50);
    });

    it('array vacío devuelve 400', async () => {
      await request(app.getHttpServer())
        .post(`${MOVIMIENTOS_URL}/entrada`)
        .set(auth(inventarioToken))
        .send([])
        .expect(400);
    });

    it('ajuste con array aplica varias filas sobre lotes distintos', async () => {
      const res = await request(app.getHttpServer())
        .post(`${MOVIMIENTOS_URL}/ajuste`)
        .set(auth(inventarioToken))
        .send([
          {
            lote_producto_terminado_id: loteBatchAId,
            cantidad: -10,
            razon: `${MARCA}: merma A`,
          },
          {
            lote_producto_terminado_id: loteBatchBId,
            cantidad: 5,
            razon: `${MARCA}: conteo B`,
          },
        ])
        .expect(201);

      const movimientos = res.body as MovimientoHttp[];
      expect(movimientos).toHaveLength(2);
      expect(movimientos[0].stock_resultante).toBe(40);
      expect(movimientos[1].stock_resultante).toBe(60);
    });

    it('salida con array junta varias filas del mismo producto sin pisarse el saldo', async () => {
      // Tras el batch anterior: loteBatchA=40, loteBatchB=60. FEFO toma
      // primero loteBatchA (vence antes).
      const producto = await prisma.loteProductoTerminado.findUniqueOrThrow({
        where: { id: loteBatchAId },
        select: { producto_terminado_id: true },
      });

      const res = await request(app.getHttpServer())
        .post(`${MOVIMIENTOS_URL}/salida`)
        .set(auth(inventarioToken))
        .send([
          {
            producto_terminado_id: producto.producto_terminado_id,
            cantidad: 30,
            razon: `${MARCA}: fila 1`,
          },
          {
            producto_terminado_id: producto.producto_terminado_id,
            cantidad: 20,
            razon: `${MARCA}: fila 2`,
          },
        ])
        .expect(201);

      const movimientos = res.body as MovimientoHttp[];
      // Fila 1 (30) sale completa de loteBatchA (quedan 10). Fila 2 (20) toma
      // los 10 que quedan de loteBatchA y 10 de loteBatchB.
      expect(movimientos).toHaveLength(3);
      expect(movimientos[0].lote_producto_terminado_id).toBe(loteBatchAId);
      expect(movimientos[0].cantidad).toBe(30);
      expect(movimientos[1].lote_producto_terminado_id).toBe(loteBatchAId);
      expect(movimientos[1].cantidad).toBe(10);
      expect(movimientos[2].lote_producto_terminado_id).toBe(loteBatchBId);
      expect(movimientos[2].cantidad).toBe(10);

      expect(await stockActualDe(producto.producto_terminado_id)).toBe(50);
    });
  });
});
