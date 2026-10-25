import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

// HU-A-024/stock de producto terminado (OFT0-258). A diferencia de insumos,
// acá NO hay create ni list propios: el catálogo (módulo catalog) ya crea la
// fila de stock automáticamente al dar de alta una producto-presentación, y
// GET /producto-presentaciones ya la devuelve embebida. Lo único que faltaba
// era poder editar stock_minimo/stock_maximo, así que este e2e solo cubre
// ese PATCH.
const MARCA = 'E2E OFT0-258';
const CATEGORIAS_URL = '/api/v1/categorias';
const PRESENTACIONES_URL = '/api/v1/presentaciones';
const PRODUCTOS_URL = '/api/v1/productos';
const PRODUCTOS_TERMINADOS_URL = '/api/v1/productos-terminados';

interface ProductoPresentacionHttp {
  id: number;
  sku: string;
}

interface ProductoHttp {
  id: number;
  producto_presentaciones: ProductoPresentacionHttp[];
}

interface ProductoTerminadoHttp {
  producto_presentacion_id: number;
  stock_actual: string;
  stock_minimo: string;
  stock_maximo: string | null;
  sku: string;
  producto_nombre: string;
  categoria_nombre: string;
}

const TEST_USERS = {
  inventario: {
    identificador: 'e2e-inventario-oft0258',
    password: 'InventarioE2e123',
    email: 'e2e-inventario-oft0258@francos.test',
    documento: '99999970',
    rol: 'inventario',
  },
  ventas_sin_stock: {
    identificador: 'e2e-ventas-oft0258',
    password: 'VentasE2e123',
    email: 'e2e-ventas-oft0258@francos.test',
    documento: '99999971',
    rol: 'ventas',
  },
} as const;

describe('Productos terminados / stock (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let inventarioToken: string;
  let ventasToken: string;
  let productoPresentacionId: number;

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
        apellido_materno: 'OFT0-258 E2E',
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
      TEST_USERS.ventas_sin_stock.identificador,
      TEST_USERS.ventas_sin_stock.password,
    );

    const categoria = (
      await request(app.getHttpServer())
        .post(CATEGORIAS_URL)
        .set(auth(adminToken))
        .send({ nombre: `${MARCA} Panadería` })
        .expect(201)
    ).body as { id: number };

    const presentacion = (
      await request(app.getHttpServer())
        .post(PRESENTACIONES_URL)
        .set(auth(adminToken))
        .send({
          cantidad: 9024,
          unidad_medida: 'gr',
          descripcion: `${MARCA} Bolsa 9024gr`,
        })
        .expect(201)
    ).body as { id: number };

    const producto = (
      await request(app.getHttpServer())
        .post(PRODUCTOS_URL)
        .set(auth(adminToken))
        .send({
          categoria_id: categoria.id,
          nombre: `${MARCA} Pan de molde`,
          descripcion: 'Creado por e2e',
          destacado: false,
          producto_presentaciones: [
            {
              presentacion_id: presentacion.id,
              precio_unitario: 10,
              precio_mayorista: 8,
              umbral_mayorista: 12,
            },
          ],
        })
        .expect(201)
    ).body as ProductoHttp;
    productoPresentacionId = producto.producto_presentaciones[0].id;
  });

  afterAll(async () => {
    await limpiarDatos();
    await deleteTestUsers();
    await app.close();
  });

  it('crear el producto ya deja su producto_terminado con los defaults (stock 0, mínimo 1, máximo null)', async () => {
    const fila = await prisma.productoTerminado.findUnique({
      where: { producto_presentacion_id: productoPresentacionId },
    });

    expect(fila).not.toBeNull();
    expect(fila?.stock_actual.toNumber()).toBe(0);
    expect(fila?.stock_minimo.toNumber()).toBe(1);
    expect(fila?.stock_maximo).toBeNull();
  });

  it('PATCH sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .patch(`${PRODUCTOS_TERMINADOS_URL}/${productoPresentacionId}`)
      .send({ stock_minimo: 10 })
      .expect(401);
  });

  it('PATCH con rol ventas (sin acceso) devuelve 403', async () => {
    await request(app.getHttpServer())
      .patch(`${PRODUCTOS_TERMINADOS_URL}/${productoPresentacionId}`)
      .set(auth(ventasToken))
      .send({ stock_minimo: 10 })
      .expect(403);
  });

  it('PATCH con rol inventario actualiza stock_minimo y stock_maximo embebiendo el catálogo', async () => {
    const res = await request(app.getHttpServer())
      .patch(`${PRODUCTOS_TERMINADOS_URL}/${productoPresentacionId}`)
      .set(auth(inventarioToken))
      .send({ stock_minimo: 15, stock_maximo: 300 })
      .expect(200);

    const body = res.body as ProductoTerminadoHttp;
    expect(Number(body.stock_minimo)).toBe(15);
    expect(Number(body.stock_maximo)).toBe(300);
    expect(Number(body.stock_actual)).toBe(0);
    expect(body.producto_presentacion_id).toBe(productoPresentacionId);
    expect(body.producto_nombre).toBe(`${MARCA} Pan de molde`);
    expect(body.categoria_nombre).toBe(`${MARCA} Panadería`);
  });

  it('PATCH solo stock_minimo no toca el stock_maximo ya guardado', async () => {
    const res = await request(app.getHttpServer())
      .patch(`${PRODUCTOS_TERMINADOS_URL}/${productoPresentacionId}`)
      .set(auth(inventarioToken))
      .send({ stock_minimo: 20 })
      .expect(200);

    const body = res.body as ProductoTerminadoHttp;
    expect(Number(body.stock_minimo)).toBe(20);
    expect(Number(body.stock_maximo)).toBe(300);
  });

  it('PATCH con stock_maximo menor que stock_minimo devuelve 409', async () => {
    await request(app.getHttpServer())
      .patch(`${PRODUCTOS_TERMINADOS_URL}/${productoPresentacionId}`)
      .set(auth(inventarioToken))
      .send({ stock_maximo: 1 })
      .expect(409);
  });

  it('PATCH sobre una producto-presentación inexistente devuelve 404', async () => {
    await request(app.getHttpServer())
      .patch(`${PRODUCTOS_TERMINADOS_URL}/999999`)
      .set(auth(inventarioToken))
      .send({ stock_minimo: 5 })
      .expect(404);
  });

  describe('GET /productos-terminados/indicadores', () => {
    // Mismo criterio que /insumos/indicadores, pero no hay movimientos de
    // producto todavía (esa HU es aparte): se fuerza stock_actual directo en
    // la base para cubrir cada nivel, como ya se hace en los e2e de insumos.
    const crearEnNivel = async (
      sufijo: string,
      datos: {
        stock_actual: number;
        stock_minimo: number;
        stock_maximo: number | null;
      },
    ) => {
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
            cantidad: 9100 + sufijo.charCodeAt(0),
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
            nombre: `${MARCA} Producto nivel ${sufijo}`,
            destacado: false,
            producto_presentaciones: [
              {
                presentacion_id: presentacion.id,
                precio_unitario: 10,
              },
            ],
          })
          .expect(201)
      ).body as ProductoHttp;

      const ppId = producto.producto_presentaciones[0].id;
      await prisma.productoTerminado.update({
        where: { producto_presentacion_id: ppId },
        data: datos,
      });
      return ppId;
    };

    it('cuenta agotado/bajo/normal/alto correctamente', async () => {
      const antes = (
        await request(app.getHttpServer())
          .get(`${PRODUCTOS_TERMINADOS_URL}/indicadores`)
          .set(auth(inventarioToken))
          .expect(200)
      ).body as {
        agotado: number;
        bajo: number;
        normal: number;
        alto: number;
        total: number;
      };

      await crearEnNivel('A', {
        stock_actual: 0,
        stock_minimo: 10,
        stock_maximo: 100,
      }); // agotado
      await crearEnNivel('B', {
        stock_actual: 5,
        stock_minimo: 10,
        stock_maximo: 100,
      }); // bajo
      await crearEnNivel('C', {
        stock_actual: 50,
        stock_minimo: 10,
        stock_maximo: 100,
      }); // normal (50% de 100)
      await crearEnNivel('D', {
        stock_actual: 95,
        stock_minimo: 10,
        stock_maximo: 100,
      }); // alto (95% de 100, > 90%)

      const despues = (
        await request(app.getHttpServer())
          .get(`${PRODUCTOS_TERMINADOS_URL}/indicadores`)
          .set(auth(inventarioToken))
          .expect(200)
      ).body as typeof antes;

      // >= y no === : el conteo es un agregado global (igual que
      // /insumos/indicadores), y otros archivos e2e corren en paralelo
      // creando/editando sus propios productos al mismo tiempo. Lo que
      // importa acá es que cada uno de los 4 que creamos haya sumado a su
      // categoría correspondiente, no el total exacto del sistema.
      expect(despues.agotado - antes.agotado).toBeGreaterThanOrEqual(1);
      expect(despues.bajo - antes.bajo).toBeGreaterThanOrEqual(1);
      expect(despues.normal - antes.normal).toBeGreaterThanOrEqual(1);
      expect(despues.alto - antes.alto).toBeGreaterThanOrEqual(1);
      expect(despues.total - antes.total).toBeGreaterThanOrEqual(4);
    });

    it('sin token devuelve 401 y con rol ventas (sin acceso) devuelve 403', async () => {
      await request(app.getHttpServer())
        .get(`${PRODUCTOS_TERMINADOS_URL}/indicadores`)
        .expect(401);
      await request(app.getHttpServer())
        .get(`${PRODUCTOS_TERMINADOS_URL}/indicadores`)
        .set(auth(ventasToken))
        .expect(403);
    });
  });
});
