import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { envs } from '../src/config/envs';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { S3Service } from '../src/infrastructure/storage/s3.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { fechaHoy } from '../src/modules/catalog/application/utils/promocion.utils';
import { FakeS3Service } from './fake-s3.service';

const ADMIN_CREDENTIALS = { identificador: 'admin', password: 'admin123' };

// Un usuario por rol que se necesita probar. El rol `ventas` es el que gestiona
// el catálogo; `inventario` es un rol que no debe tener acceso.
const TEST_USERS = {
  ventas: {
    identificador: 'e2e-ventas-catalogo',
    password: 'VentasE2e123',
    email: 'e2e-ventas-catalogo@francos.test',
    documento: '99999996',
    rol: 'ventas',
  },
  inventario: {
    identificador: 'e2e-inventario-catalogo',
    password: 'InventarioE2e123',
    email: 'e2e-inventario-catalogo@francos.test',
    documento: '99999995',
    rol: 'inventario',
  },
} as const;

// Marcas para reconocer (y borrar) solo los datos que crea este archivo.
const CATEGORIA_NOMBRE = 'E2E Categoría OFT0-345';
const PRESENTACION_DESCRIPCION = 'E2E OFT0-345';
const PRODUCTO_NOMBRE = 'E2E Producto OFT0-345';

describe('Catálogo (e2e)', () => {
  const fakeS3Service = new FakeS3Service();
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let ventasToken: string;
  let inventarioToken: string;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  let categoriaId: number;
  let presentacionId: number;
  let productoId: number;

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
        apellido_materno: 'Catálogo E2E',
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

  // Borra en orden de dependencia (producto_presentacion -> producto ->
  // presentacion/categoria) todo lo que tenga las marcas de este archivo.
  const deleteTestCatalogData = async () => {
    const productos = await prisma.producto.findMany({
      where: { nombre: { startsWith: PRODUCTO_NOMBRE, mode: 'insensitive' } },
      select: { id: true },
    });
    const productoIds = productos.map(({ id }) => id);

    const presentaciones = await prisma.productoPresentacion.findMany({
      where: { producto_id: { in: productoIds } },
      select: { id: true },
    });
    await prisma.promocion.deleteMany({
      where: {
        producto_presentacion_id: { in: presentaciones.map(({ id }) => id) },
      },
    });
    await prisma.productoTerminado.deleteMany({
      where: {
        producto_presentacion_id: { in: presentaciones.map(({ id }) => id) },
      },
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Service)
      .useValue(fakeS3Service)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    // Limpia restos de una corrida anterior que haya quedado a medias.
    await deleteTestUsers();
    await deleteTestCatalogData();

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

    await createTestUser(TEST_USERS.ventas);
    await createTestUser(TEST_USERS.inventario);

    adminToken = await login(ADMIN_CREDENTIALS);
    ventasToken = await login(TEST_USERS.ventas);
    inventarioToken = await login(TEST_USERS.inventario);
  });

  afterAll(async () => {
    await deleteTestCatalogData();
    await deleteTestUsers();
    await prisma.refreshToken.deleteMany({
      where: {
        user_id: adminUserId,
        id: { notIn: existingAdminRefreshTokenIds },
      },
    });
    await app.close();
  });

  describe('categorías', () => {
    it('GET /api/v1/categorias sin token devuelve 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/categorias').expect(401);
    });

    it('GET /api/v1/categorias con rol inventario devuelve 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/categorias')
        .set('Authorization', `Bearer ${inventarioToken}`)
        .expect(403);
    });

    it('GET /api/v1/categorias con rol ventas devuelve 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/categorias')
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
    });

    it('POST /api/v1/categorias con rol ventas devuelve 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/categorias')
        .set('Authorization', `Bearer ${ventasToken}`)
        .send({ nombre: CATEGORIA_NOMBRE })
        .expect(403);
    });

    it('POST /api/v1/categorias con rol admin devuelve 201', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: CATEGORIA_NOMBRE, descripcion: 'Creada por e2e' })
        .expect(201);

      categoriaId = (response.body as unknown as { id: number }).id;
      expect(categoriaId).toEqual(expect.any(Number));
    });

    it('GET /api/v1/categorias/:id con rol ventas devuelve 200', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/categorias/${categoriaId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: categoriaId,
        nombre: CATEGORIA_NOMBRE,
      });
    });

    it('PATCH /api/v1/categorias/:id con rol ventas devuelve 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/categorias/${categoriaId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .send({ descripcion: 'Intento de ventas' })
        .expect(403);
    });

    it('DELETE /api/v1/categorias/:id con rol ventas devuelve 403', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/categorias/${categoriaId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(403);
    });
  });

  describe('presentaciones', () => {
    it('GET /api/v1/presentaciones sin token devuelve 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/presentaciones')
        .expect(401);
    });

    it('GET /api/v1/presentaciones con rol inventario devuelve 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/presentaciones')
        .set('Authorization', `Bearer ${inventarioToken}`)
        .expect(403);
    });

    it('GET /api/v1/presentaciones con rol ventas devuelve 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/presentaciones')
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
    });

    it('POST /api/v1/presentaciones con rol ventas devuelve 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/presentaciones')
        .set('Authorization', `Bearer ${ventasToken}`)
        .send({
          cantidad: 7777,
          unidad_medida: 'gr',
          descripcion: PRESENTACION_DESCRIPCION,
        })
        .expect(403);
    });

    it('POST /api/v1/presentaciones con rol admin devuelve 201', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/presentaciones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cantidad: 7777,
          unidad_medida: 'gr',
          descripcion: PRESENTACION_DESCRIPCION,
        })
        .expect(201);

      presentacionId = (response.body as unknown as { id: number }).id;
      expect(presentacionId).toEqual(expect.any(Number));
    });

    it('GET /api/v1/presentaciones/:id con rol ventas devuelve 200', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/presentaciones/${presentacionId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: presentacionId,
        cantidad: 7777,
        unidad_medida: 'gr',
      });
    });

    it('PATCH /api/v1/presentaciones/:id con rol ventas devuelve 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/presentaciones/${presentacionId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .send({ descripcion: 'Intento de ventas' })
        .expect(403);
    });

    it('DELETE /api/v1/presentaciones/:id con rol ventas devuelve 403', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/presentaciones/${presentacionId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(403);
    });
  });

  describe('productos', () => {
    const nuevoProducto = () => ({
      categoria_id: categoriaId,
      nombre: PRODUCTO_NOMBRE,
      descripcion: 'Creado por e2e',
      destacado: false,
      producto_presentaciones: [
        {
          presentacion_id: presentacionId,
          precio_unitario: 10,
          precio_mayorista: 8,
          umbral_mayorista: 12,
        },
      ],
    });

    it('POST /api/v1/productos sin token devuelve 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/productos')
        .send(nuevoProducto())
        .expect(401);
    });

    it('POST /api/v1/productos con rol inventario devuelve 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${inventarioToken}`)
        .send(nuevoProducto())
        .expect(403);
    });

    it('POST /api/v1/productos con rol ventas devuelve 201 y asigna SKU', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${ventasToken}`)
        .send(nuevoProducto())
        .expect(201);

      const body = response.body as unknown as {
        id: number;
        producto_presentaciones: { sku: string }[];
      };
      productoId = body.id;
      expect(body.producto_presentaciones).toHaveLength(1);
      expect(body.producto_presentaciones[0].sku).toBe(
        `FR-P${productoId}-PR${presentacionId}`,
      );
    });

    it('al crear el producto se crea el producto terminado de cada presentación (RF-A024)', async () => {
      const terminados = await prisma.productoTerminado.findMany({
        where: { producto_presentacion: { producto_id: productoId } },
      });

      expect(terminados).toHaveLength(1);
      expect(terminados[0].stock_actual.toNumber()).toBe(0);
      expect(terminados[0].stock_minimo.toNumber()).toBe(1);
      expect(terminados[0].stock_maximo).toBeNull();
    });

    it('la presentación nace oculta en el Portal B (RF-A025)', async () => {
      const presentaciones = await prisma.productoPresentacion.findMany({
        where: { producto_id: productoId },
      });

      expect(presentaciones).toHaveLength(1);
      expect(presentaciones[0].visible_portal_b).toBe(false);
    });

    it('POST /api/v1/producto-presentaciones agrega una presentación y crea su producto terminado', async () => {
      const otraPresentacion = await prisma.presentacion.create({
        data: {
          cantidad: 7778,
          unidad_medida: 'gr',
          descripcion: PRESENTACION_DESCRIPCION,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/producto-presentaciones')
        .set('Authorization', `Bearer ${ventasToken}`)
        .send({
          producto_id: productoId,
          presentacion_id: otraPresentacion.id,
          precio_unitario: 18,
          precio_mayorista: 15,
          umbral_mayorista: 6,
        })
        .expect(201);

      const { id } = response.body as unknown as { id: number };
      const terminado = await prisma.productoTerminado.findUniqueOrThrow({
        where: { producto_presentacion_id: id },
      });
      expect(terminado.stock_actual.toNumber()).toBe(0);
      expect(terminado.stock_minimo.toNumber()).toBe(1);

      const presentacion = await prisma.productoPresentacion.findUniqueOrThrow({
        where: { id },
      });
      expect(presentacion.visible_portal_b).toBe(false);
    });

    it('POST /api/v1/producto-presentaciones con una presentación repetida devuelve 409 y no crea nada', async () => {
      const antes = await prisma.productoTerminado.count({
        where: { producto_presentacion: { producto_id: productoId } },
      });

      await request(app.getHttpServer())
        .post('/api/v1/producto-presentaciones')
        .set('Authorization', `Bearer ${ventasToken}`)
        .send({
          producto_id: productoId,
          presentacion_id: presentacionId,
          precio_unitario: 18,
        })
        .expect(409);

      await expect(
        prisma.productoTerminado.count({
          where: { producto_presentacion: { producto_id: productoId } },
        }),
      ).resolves.toBe(antes);
    });

    it('permite registrar un producto con el nombre que otro tenía antes de renombrarse (slug único)', async () => {
      const nombreOriginal = `${PRODUCTO_NOMBRE} renombrable`;
      const crear = (nombre: string) =>
        request(app.getHttpServer())
          .post('/api/v1/productos')
          .set('Authorization', `Bearer ${ventasToken}`)
          .send({ ...nuevoProducto(), nombre });

      const primero = await crear(nombreOriginal).expect(201);
      const primeroId = (primero.body as unknown as { id: number }).id;

      // El slug no se edita: el producto renombrado conserva el del nombre original.
      await request(app.getHttpServer())
        .patch(`/api/v1/productos/${primeroId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .send({ nombre: `${nombreOriginal} nuevo` })
        .expect(200);

      const segundo = await crear(nombreOriginal).expect(201);
      const segundoId = (segundo.body as unknown as { id: number }).id;

      const presentaciones = await prisma.productoPresentacion.findMany({
        where: { producto_id: { in: [primeroId, segundoId] } },
        select: { slug: true },
      });
      const slugs = presentaciones.map(({ slug }) => slug);
      expect(slugs).toHaveLength(2);
      expect(new Set(slugs).size).toBe(2);
    });

    it('POST /api/v1/productos con nombre repetido devuelve 409', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${ventasToken}`)
        .send(nuevoProducto())
        .expect(409);
    });

    it('POST /api/v1/productos rechaza campos no declarados con 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${ventasToken}`)
        .send({ ...nuevoProducto(), nombre: 'Otro', campo_extra: 'x' })
        .expect(400);
    });

    it('GET /api/v1/productos con rol ventas devuelve 200 con el producto', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/productos')
        .query({ search: PRODUCTO_NOMBRE })
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(200);

      const body = response.body as unknown as { data: { id: number }[] };
      expect(body.data.map(({ id }) => id)).toContain(productoId);
    });

    it('GET /api/v1/productos/:id con rol ventas devuelve 200', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/productos/${productoId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(200);
    });

    it('PATCH /api/v1/productos/:id con rol ventas devuelve 200', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/productos/${productoId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .send({ destacado: true })
        .expect(200);

      expect(response.body).toMatchObject({ id: productoId, destacado: true });
    });

    it('DELETE /api/v1/productos/:id desactiva y PATCH :id/activate reactiva', async () => {
      const desactivado = await request(app.getHttpServer())
        .delete(`/api/v1/productos/${productoId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(200);
      expect(desactivado.body).toMatchObject({ estado: false });

      const reactivado = await request(app.getHttpServer())
        .patch(`/api/v1/productos/${productoId}/activate`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(200);
      expect(reactivado.body).toMatchObject({ estado: true });
    });
  });

  describe('imagen de la presentación (POST /producto-presentaciones/:id/imagen)', () => {
    let productoPresentacionId: number;
    // Nest valida el tipo por los primeros bytes del archivo (no por el
    // Content-Type), así que cada tipo necesita su firma real.
    const PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    );
    const JPG = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    ]);
    const GIF = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
      0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x3b,
    ]);
    const PDF = Buffer.from('%PDF-1.4 %%EOF');

    const subir = (
      id: number,
      archivo: Buffer,
      contentType: string,
      token = ventasToken,
    ) =>
      request(app.getHttpServer())
        .post(`/api/v1/producto-presentaciones/${id}/imagen`)
        .set('Authorization', `Bearer ${token}`)
        .attach('imagen', archivo, { filename: 'foto', contentType });

    beforeAll(async () => {
      const presentacion = await prisma.productoPresentacion.findFirstOrThrow({
        where: { producto_id: productoId },
        orderBy: { id: 'asc' },
      });
      productoPresentacionId = presentacion.id;
    });

    it('sube la imagen, guarda solo la key y responde con la URL armada', async () => {
      const response = await subir(
        productoPresentacionId,
        PNG,
        'image/png',
      ).expect(201);

      const guardada = await prisma.productoPresentacion.findUniqueOrThrow({
        where: { id: productoPresentacionId },
      });
      const key = guardada.imagen_key as string;
      expect(key).toMatch(/^productos\/[0-9a-f-]{36}\.png$/);
      expect((response.body as { imagen_url: string }).imagen_url).toBe(
        `${envs.mediaBaseUrl}/${key}`,
      );
      expect(fakeS3Service.objeto('media', key)).toMatchObject({
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000, immutable',
      });
    });

    it('al reemplazarla usa otra key y deja la anterior sin borrar', async () => {
      const antes = await prisma.productoPresentacion.findUniqueOrThrow({
        where: { id: productoPresentacionId },
      });

      await subir(productoPresentacionId, JPG, 'image/jpeg').expect(201);

      const despues = await prisma.productoPresentacion.findUniqueOrThrow({
        where: { id: productoPresentacionId },
      });
      expect(despues.imagen_key).not.toBe(antes.imagen_key);
      expect(despues.imagen_key).toMatch(/\.jpg$/);
      expect(fakeS3Service.existe('media', antes.imagen_key as string)).toBe(
        true,
      );
    });

    it('rechaza tipos que no son jpg, png o webp (400)', async () => {
      await subir(productoPresentacionId, GIF, 'image/gif').expect(400);
      await subir(productoPresentacionId, PDF, 'application/pdf').expect(400);
    });

    it('rechaza una imagen de más de 2 MB (413)', async () => {
      await subir(
        productoPresentacionId,
        Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]),
        'image/png',
      ).expect(413);
    });

    it('sin archivo devuelve 400, sin token 401 y con rol inventario 403', async () => {
      await request(app.getHttpServer())
        .post(
          `/api/v1/producto-presentaciones/${productoPresentacionId}/imagen`,
        )
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(400);
      await request(app.getHttpServer())
        .post(
          `/api/v1/producto-presentaciones/${productoPresentacionId}/imagen`,
        )
        .expect(401);
      await subir(
        productoPresentacionId,
        PNG,
        'image/png',
        inventarioToken,
      ).expect(403);
    });

    it('devuelve 404 si la presentación no existe', async () => {
      await subir(999999, PNG, 'image/png').expect(404);
    });

    it('ya no acepta imagen_url al crear ni al editar (400)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/producto-presentaciones/${productoPresentacionId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .send({ imagen_url: 'https://example.com/a.jpg' })
        .expect(400);
    });
  });

  describe('listado del catálogo (GET /producto-presentaciones)', () => {
    interface FilaListado {
      id: number;
      sku: string;
      visible_portal_b: boolean;
      producto: {
        id: number;
        nombre: string;
        destacado: boolean;
        categoria: { id: number; nombre: string };
      };
      presentacion: { id: number; cantidad: number; unidad_medida: string };
      producto_terminado: { stock_actual: number; stock_minimo: number } | null;
      promocion_vigente: {
        id: number;
        valor: number;
        fecha_inicio: string;
        fecha_fin: string;
      } | null;
    }

    let productoPresentacionId: number;

    const listar = (query: Record<string, string | number | boolean> = {}) =>
      request(app.getHttpServer())
        .get('/api/v1/producto-presentaciones')
        .query({ search: PRODUCTO_NOMBRE, ...query })
        .set('Authorization', `Bearer ${ventasToken}`);

    const filas = (body: unknown) => (body as { data: FilaListado[] }).data;

    const filaDelProducto = async () =>
      filas((await listar().expect(200)).body).find(
        ({ id }) => id === productoPresentacionId,
      );

    beforeAll(async () => {
      const presentacion = await prisma.productoPresentacion.findFirstOrThrow({
        where: { producto_id: productoId },
        orderBy: { id: 'asc' },
      });
      productoPresentacionId = presentacion.id;
      await prisma.productoTerminado.update({
        where: { producto_presentacion_id: presentacion.id },
        data: { stock_actual: 12 },
      });
    });

    afterAll(async () => {
      await prisma.productoTerminado.update({
        where: { producto_presentacion_id: productoPresentacionId },
        data: { stock_actual: 0 },
      });
    });

    it('sin token devuelve 401 y con rol inventario devuelve 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/producto-presentaciones')
        .expect(401);
      await request(app.getHttpServer())
        .get('/api/v1/producto-presentaciones')
        .set('Authorization', `Bearer ${inventarioToken}`)
        .expect(403);
    });

    it('cada fila trae producto, categoría, presentación, stock, visibilidad y precios', async () => {
      const response = await listar().expect(200);

      const fila = filas(response.body).find(
        ({ id }) => id === productoPresentacionId,
      );
      expect(fila).toMatchObject({
        sku: `FR-P${productoId}-PR${presentacionId}`,
        precio_unitario: 10,
        precio_mayorista: 8,
        umbral_mayorista: 12,
        visible_portal_b: false,
        producto: {
          id: productoId,
          nombre: PRODUCTO_NOMBRE,
          destacado: true,
          categoria: { id: categoriaId, nombre: CATEGORIA_NOMBRE },
        },
        presentacion: {
          id: presentacionId,
          cantidad: 7777,
          unidad_medida: 'gr',
        },
        producto_terminado: { stock_actual: 12, stock_minimo: 1 },
        promocion_vigente: null,
      });
      expect(
        (response.body as { meta: { total: number } }).meta.total,
      ).toBeGreaterThanOrEqual(2);
    });

    it('muestra la promoción vigente y no muestra una que ya venció', async () => {
      const vencida = await request(app.getHttpServer())
        .post('/api/v1/promociones')
        .set('Authorization', `Bearer ${ventasToken}`)
        .send({
          producto_presentacion_id: productoPresentacionId,
          valor: 30,
          fecha_inicio: '2020-01-01',
          fecha_fin: '2020-01-31',
        })
        .expect(201);
      expect((vencida.body as { vigente: boolean }).vigente).toBe(false);
      expect((await filaDelProducto())?.promocion_vigente).toBeNull();

      const hoy = fechaHoy();
      await request(app.getHttpServer())
        .post('/api/v1/promociones')
        .set('Authorization', `Bearer ${ventasToken}`)
        .send({
          producto_presentacion_id: productoPresentacionId,
          valor: 50,
          fecha_inicio: hoy,
          fecha_fin: '2099-12-31',
        })
        .expect(201);

      expect((await filaDelProducto())?.promocion_vigente).toMatchObject({
        valor: 50,
        fecha_inicio: hoy,
        fecha_fin: '2099-12-31',
      });
    });

    it('filtra por categoría, presentación y estado', async () => {
      const porCategoria = filas(
        (await listar({ categoria_id: categoriaId }).expect(200)).body,
      );
      expect(porCategoria.length).toBeGreaterThanOrEqual(2);
      expect(
        porCategoria.every(
          ({ producto }) => producto.categoria.id === categoriaId,
        ),
      ).toBe(true);

      expect(
        filas((await listar({ categoria_id: 999999999 }).expect(200)).body),
      ).toHaveLength(0);

      const porPresentacion = filas(
        (await listar({ presentacion_id: presentacionId }).expect(200)).body,
      );
      expect(porPresentacion.map(({ id }) => id)).toContain(
        productoPresentacionId,
      );
      expect(
        porPresentacion.every(
          ({ presentacion }) => presentacion.id === presentacionId,
        ),
      ).toBe(true);

      expect(
        filas((await listar({ estado: true }).expect(200)).body).length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        filas((await listar({ estado: false }).expect(200)).body),
      ).toHaveLength(0);
    });

    it('filtra por disponibilidad (con stock o agotado)', async () => {
      const conStock = filas(
        (await listar({ con_stock: true }).expect(200)).body,
      );
      expect(conStock.map(({ id }) => id)).toEqual([productoPresentacionId]);

      const agotadas = filas(
        (await listar({ con_stock: false }).expect(200)).body,
      );
      expect(agotadas.length).toBeGreaterThanOrEqual(1);
      expect(agotadas.map(({ id }) => id)).not.toContain(
        productoPresentacionId,
      );
    });

    it('busca por nombre del producto, sin distinguir mayúsculas', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/producto-presentaciones')
        .query({ search: PRODUCTO_NOMBRE.toUpperCase() })
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(200);

      expect(filas(response.body).length).toBeGreaterThanOrEqual(2);
    });

    it('pagina el resultado', async () => {
      const response = await listar({ page: 2, limit: 1 }).expect(200);

      const body = response.body as {
        data: FilaListado[];
        meta: { page: number; limit: number; total_pages: number };
      };
      expect(body.data).toHaveLength(1);
      expect(body.meta).toMatchObject({ page: 2, limit: 1 });
      expect(body.meta.total_pages).toBeGreaterThanOrEqual(2);
    });
  });
});
