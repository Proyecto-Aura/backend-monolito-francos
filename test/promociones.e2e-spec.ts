import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { fechaHoy } from '../src/modules/catalog/application/utils/promocion.utils';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';

const ADMIN_CREDENTIALS = { identificador: 'admin', password: 'admin123' };

// `ventas` gestiona las promociones; `inventario` es un rol sin acceso.
const TEST_USERS = {
  ventas: {
    identificador: 'e2e-ventas-promociones',
    password: 'VentasE2e123',
    email: 'e2e-ventas-promociones@francos.test',
    documento: '99999994',
    rol: 'ventas',
  },
  inventario: {
    identificador: 'e2e-inventario-promociones',
    password: 'InventarioE2e123',
    email: 'e2e-inventario-promociones@francos.test',
    documento: '99999992',
    rol: 'inventario',
  },
} as const;

// Marcas para reconocer (y borrar) solo los datos que crea este archivo.
const CATEGORIA_NOMBRE = 'E2E Categoría Promociones OFT0-345';
const PRESENTACION_DESCRIPCION = 'E2E Promociones OFT0-345';
const PRODUCTO_NOMBRE = 'E2E Producto Promociones OFT0-345';

interface PromocionBody {
  id: number;
  producto_presentacion_id: number;
  nombre: string;
  tipo: string;
  valor: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: boolean;
  vigente: boolean;
}

// Suma días a una fecha YYYY-MM-DD sin depender de la zona horaria.
const sumarDias = (fecha: string, dias: number): string => {
  const date = new Date(`${fecha}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dias);
  return date.toISOString().slice(0, 10);
};

describe('Promociones (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  let ventasToken: string;
  let inventarioToken: string;
  let presentacionActivaId: number;
  let presentacionInactivaId: number;
  let promoAId: number;
  let promoBId: number;
  let promoCId: number;

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
        apellido_materno: 'Promociones E2E',
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

  // Borra en orden de dependencia: promociones -> producto_presentacion ->
  // producto -> presentacion/categoria.
  const deleteTestCatalogData = async () => {
    const productos = await prisma.producto.findMany({
      where: { nombre: { equals: PRODUCTO_NOMBRE, mode: 'insensitive' } },
      select: { id: true },
    });
    const productoIds = productos.map(({ id }) => id);
    const presentaciones = await prisma.productoPresentacion.findMany({
      where: { producto_id: { in: productoIds } },
      select: { id: true },
    });
    const productoPresentacionIds = presentaciones.map(({ id }) => id);

    await prisma.promocion.deleteMany({
      where: { producto_presentacion_id: { in: productoPresentacionIds } },
    });
    await prisma.productoPresentacion.deleteMany({
      where: { id: { in: productoPresentacionIds } },
    });
    await prisma.producto.deleteMany({ where: { id: { in: productoIds } } });
    await prisma.presentacion.deleteMany({
      where: { descripcion: PRESENTACION_DESCRIPCION },
    });
    await prisma.categoria.deleteMany({ where: { nombre: CATEGORIA_NOMBRE } });
  };

  const promoPayload = (overrides: Record<string, unknown> = {}) => ({
    producto_presentacion_id: presentacionActivaId,
    valor: 50,
    fecha_inicio: hoy,
    fecha_fin: sumarDias(hoy, 30),
    ...overrides,
  });

  const crearPromocion = (
    payload: Record<string, unknown>,
    token = ventasToken,
  ) =>
    request(app.getHttpServer())
      .post('/api/v1/promociones')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    // Datos del catálogo: un producto con una presentación activa y otra inactiva.
    const categoria = await prisma.categoria.create({
      data: { nombre: CATEGORIA_NOMBRE },
    });
    const presentacionA = await prisma.presentacion.create({
      data: {
        cantidad: 7771,
        unidad_medida: 'gr',
        descripcion: PRESENTACION_DESCRIPCION,
      },
    });
    const presentacionB = await prisma.presentacion.create({
      data: {
        cantidad: 7772,
        unidad_medida: 'gr',
        descripcion: PRESENTACION_DESCRIPCION,
      },
    });
    const producto = await prisma.producto.create({
      data: { categoria_id: categoria.id, nombre: PRODUCTO_NOMBRE },
    });
    const activa = await prisma.productoPresentacion.create({
      data: {
        sku: `FR-P${producto.id}-PR${presentacionA.id}`,
        precio_unitario: 10,
        producto_id: producto.id,
        presentacion_id: presentacionA.id,
      },
    });
    const inactiva = await prisma.productoPresentacion.create({
      data: {
        sku: `FR-P${producto.id}-PR${presentacionB.id}`,
        precio_unitario: 10,
        producto_id: producto.id,
        presentacion_id: presentacionB.id,
        estado: false,
      },
    });
    presentacionActivaId = activa.id;
    presentacionInactivaId = inactiva.id;

    await createTestUser(TEST_USERS.ventas);
    await createTestUser(TEST_USERS.inventario);

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

  describe('autorización', () => {
    it('POST /api/v1/promociones sin token devuelve 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/promociones')
        .send(promoPayload())
        .expect(401);
    });

    it('GET /api/v1/promociones sin token devuelve 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/promociones').expect(401);
    });

    it('POST /api/v1/promociones con rol inventario devuelve 403', async () => {
      await crearPromocion(promoPayload(), inventarioToken).expect(403);
    });

    it('GET /api/v1/promociones con rol inventario devuelve 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/promociones')
        .set('Authorization', `Bearer ${inventarioToken}`)
        .expect(403);
    });
  });

  describe('crear', () => {
    it('con rol ventas devuelve 201 con un descuento por porcentaje vigente', async () => {
      const response = await crearPromocion(promoPayload()).expect(201);

      const body = response.body as unknown as PromocionBody;
      promoAId = body.id;
      expect(body).toMatchObject({
        producto_presentacion_id: presentacionActivaId,
        nombre: 'Descuento 50%',
        tipo: 'porcentaje',
        valor: 50,
        fecha_inicio: hoy,
        fecha_fin: sumarDias(hoy, 30),
        estado: true,
        vigente: true,
      });
    });

    it('una promoción futura se crea pero no está vigente todavía', async () => {
      const response = await crearPromocion(
        promoPayload({
          nombre: 'E2E Promo futura',
          fecha_inicio: sumarDias(hoy, 31),
          fecha_fin: sumarDias(hoy, 60),
        }),
      ).expect(201);

      const body = response.body as unknown as PromocionBody;
      promoBId = body.id;
      expect(body).toMatchObject({
        nombre: 'E2E Promo futura',
        vigente: false,
      });
    });

    it('devuelve 409 si se cruza con otra promoción activa de la presentación', async () => {
      await crearPromocion(
        promoPayload({
          fecha_inicio: sumarDias(hoy, 10),
          fecha_fin: sumarDias(hoy, 40),
        }),
      ).expect(409);
    });

    it('devuelve 409 si la fecha de fin es anterior a la de inicio', async () => {
      await crearPromocion(
        promoPayload({
          fecha_inicio: sumarDias(hoy, 100),
          fecha_fin: sumarDias(hoy, 99),
        }),
      ).expect(409);
    });

    it('devuelve 409 si la presentación del producto está inactiva', async () => {
      await crearPromocion(
        promoPayload({ producto_presentacion_id: presentacionInactivaId }),
      ).expect(409);
    });

    it('devuelve 404 si la presentación del producto no existe', async () => {
      await crearPromocion(
        promoPayload({ producto_presentacion_id: 999999999 }),
      ).expect(404);
    });

    it.each([
      ['porcentaje igual a 100', { valor: 100 }],
      ['porcentaje igual a 0', { valor: 0 }],
      ['porcentaje con más de 2 decimales', { valor: 10.123 }],
      ['fecha de inicio con formato inválido', { fecha_inicio: '01/10/2026' }],
      [
        'fecha de fin que no existe en el calendario',
        { fecha_fin: '2026-02-31' },
      ],
      ['fecha de fin con hora', { fecha_fin: `${hoy}T10:00:00.000Z` }],
      ['un campo que no existe (tipo)', { tipo: 'monto_fijo' }],
      ['un campo que no existe (estado)', { estado: false }],
    ])('devuelve 400 con %s', async (_caso, cambios) => {
      await crearPromocion(promoPayload(cambios)).expect(400);
    });

    it('devuelve 400 si falta la fecha de fin', async () => {
      const payload: Record<string, unknown> = promoPayload();
      delete payload.fecha_fin;

      await crearPromocion(payload).expect(400);
    });
  });

  describe('consultar', () => {
    it('GET /api/v1/promociones filtra por presentación del producto', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/promociones')
        .query({ producto_presentacion_id: presentacionActivaId })
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(200);

      const body = response.body as unknown as {
        data: PromocionBody[];
        meta: { total: number };
      };
      expect(body.data.map(({ id }) => id).sort()).toEqual(
        [promoAId, promoBId].sort(),
      );
      expect(body.meta.total).toBe(2);
    });

    it('GET /api/v1/promociones/:id devuelve 200', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/promociones/${promoAId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(200);

      expect(response.body).toMatchObject({ id: promoAId, valor: 50 });
    });

    it('GET /api/v1/promociones/:id inexistente devuelve 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/promociones/999999999')
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(404);
    });
  });

  describe('editar, desactivar y reactivar', () => {
    it('PATCH cambia el porcentaje y actualiza el nombre generado', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/promociones/${promoAId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .send({ valor: 25 })
        .expect(200);

      expect(response.body).toMatchObject({
        id: promoAId,
        valor: 25,
        nombre: 'Descuento 25%',
      });
    });

    it('PATCH no permite cambiar la presentación del producto (400)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/promociones/${promoAId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .send({ producto_presentacion_id: presentacionInactivaId })
        .expect(400);
    });

    it('PATCH devuelve 409 si las nuevas fechas se cruzan con otra promoción', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/promociones/${promoAId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .send({ fecha_fin: sumarDias(hoy, 40) })
        .expect(409);
    });

    it('DELETE desactiva la promoción y deja de estar vigente', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/promociones/${promoAId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(200);

      expect(response.body).toMatchObject({ estado: false, vigente: false });
    });

    it('con la promoción desactivada ya se puede crear otra en esas fechas', async () => {
      const response = await crearPromocion(
        promoPayload({
          fecha_inicio: sumarDias(hoy, 1),
          fecha_fin: sumarDias(hoy, 5),
        }),
      ).expect(201);

      promoCId = (response.body as unknown as PromocionBody).id;
    });

    it('PATCH /:id/activate devuelve 409 si ahora se cruza con otra activa', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/promociones/${promoAId}/activate`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(409);
    });

    it('PATCH /:id/activate reactiva la promoción cuando ya no hay cruces', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/promociones/${promoCId}`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/promociones/${promoAId}/activate`)
        .set('Authorization', `Bearer ${ventasToken}`)
        .expect(200);

      expect(response.body).toMatchObject({ estado: true, vigente: true });
    });
  });
});
