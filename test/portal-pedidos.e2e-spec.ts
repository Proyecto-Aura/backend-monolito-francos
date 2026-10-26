import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';

const ADMIN_CREDENTIALS = { identificador: 'admin', password: 'admin123' };
const PASSWORD = 'VentasE2e123';
const DIRECCION_PERFIL = 'Jr. Huallaga 320, Cercado de Lima';

type TestUser = {
  identificador: string;
  email: string;
  documento: string;
  rol: 'cliente' | 'ventas';
  // Registro Cliente vinculado: activo, inactivo o ninguno.
  cliente: 'activo' | 'inactivo' | null;
  direccion: string | null;
  // Empresa identificada con RUC (HU-B-009); por defecto persona natural con DNI.
  razon_social?: string;
};

const RUC_EMPRESA = '20555555556';
const RAZON_SOCIAL_EMPRESA = 'E2E Distribuidora Andina S.A.C.';
const RUC_FACTURA = '20601234565';

// `cliente` confirma su carrito; `ventas` es un rol interno sin acceso al portal.
const TEST_USERS = {
  cliente: {
    identificador: 'e2e-cliente-resumen',
    email: 'e2e-cliente-resumen@francos.test',
    documento: '99999951',
    rol: 'cliente',
    cliente: 'activo',
    direccion: DIRECCION_PERFIL,
  },
  empresa: {
    identificador: 'e2e-cliente-resumen-em',
    email: 'e2e-cliente-resumen-em@francos.test',
    documento: RUC_EMPRESA,
    rol: 'cliente',
    cliente: 'activo',
    direccion: DIRECCION_PERFIL,
    razon_social: RAZON_SOCIAL_EMPRESA,
  },
  sinDireccion: {
    identificador: 'e2e-cliente-resumen-sd',
    email: 'e2e-cliente-resumen-sd@francos.test',
    documento: '99999952',
    rol: 'cliente',
    cliente: 'activo',
    direccion: null,
  },
  inactivo: {
    identificador: 'e2e-cliente-resumen-in',
    email: 'e2e-cliente-resumen-in@francos.test',
    documento: '99999953',
    rol: 'cliente',
    cliente: 'inactivo',
    direccion: DIRECCION_PERFIL,
  },
  sinCliente: {
    identificador: 'e2e-cliente-resumen-nc',
    email: 'e2e-cliente-resumen-nc@francos.test',
    documento: '99999954',
    rol: 'cliente',
    cliente: null,
    direccion: null,
  },
  ventas: {
    identificador: 'e2e-ventas-resumen',
    email: 'e2e-ventas-resumen@francos.test',
    documento: '99999955',
    rol: 'ventas',
    cliente: null,
    direccion: null,
  },
} satisfies Record<string, TestUser>;

// Marcas para reconocer (y borrar) solo los datos que crea este archivo.
const CATEGORIA_NOMBRE = 'E2E Categoría Resumen OFT0-529';
const PRESENTACION_DESCRIPCION = 'E2E Resumen OFT0-529';
const PRODUCTO_NOMBRE = 'E2E Producto Resumen OFT0-529';

interface ResumenBody {
  tipo_entrega: string;
  direccion_perfil: string | null;
  direccion_entrega: string | null;
  comprobante: {
    tipo_comprobante: string;
    ruc: string | null;
    razon_social: string | null;
  };
  comprobante_sugerido: { ruc: string; razon_social: string } | null;
  items: {
    producto_presentacion_id: number;
    cantidad: number;
    precio_unitario: number;
    precio_aplicado: number;
    es_mayorista: boolean;
    subtotal: number;
  }[];
  subtotal: number;
  total: number;
}

describe('Resumen del pedido del portal (e2e, HU-B-007)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  const tokens: Partial<Record<keyof typeof TEST_USERS | 'admin', string>> = {};
  let presentacionMayoristaId: number;
  let presentacionSimpleId: number;
  let presentacionInactivaId: number;
  let presentacionOcultaId: number;

  const login = async (credentials: {
    identificador: string;
    password: string;
  }) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(credentials);

    expect([200, 201]).toContain(response.status);
    const body = response.body as unknown as { access_token: string };
    expect(body).toHaveProperty('access_token');
    return body.access_token;
  };

  const resumen = (payload: Record<string, unknown>, token?: string) => {
    const req = request(app.getHttpServer()).post(
      '/api/v1/portal/pedidos/resumen',
    );
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req.send(payload);
  };

  // 30 bolsas de la mayorista (supera el umbral de 24) + 4 de la simple:
  // 30 x 4.20 + 4 x 9.90 = 126.00 + 39.60 = 165.60.
  const payload = (overrides: Record<string, unknown> = {}) => ({
    items: [
      { producto_presentacion_id: presentacionMayoristaId, cantidad: 30 },
      { producto_presentacion_id: presentacionSimpleId, cantidad: 4 },
    ],
    tipo_entrega: 'delivery',
    ...overrides,
  });

  const deleteTestData = async () => {
    for (const testUser of Object.values(TEST_USERS)) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ username: testUser.identificador }, { email: testUser.email }],
        },
        select: { id: true },
      });

      if (user) {
        await prisma.$transaction([
          prisma.refreshToken.deleteMany({ where: { user_id: user.id } }),
          prisma.usuarioRol.deleteMany({ where: { user_id: user.id } }),
          prisma.user.delete({ where: { id: user.id } }),
        ]);
      }

      await prisma.cliente.deleteMany({
        where: { persona: { numero_documento: testUser.documento } },
      });
      await prisma.persona.deleteMany({
        where: { numero_documento: testUser.documento },
      });
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

  const createTestUser = async (testUser: TestUser) => {
    const rol = await prisma.rol.findUniqueOrThrow({
      where: { nombre: testUser.rol },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Rosa Elena',
        apellido_paterno: testUser.rol,
        apellido_materno: 'Resumen E2E',
        tipo_documento: testUser.razon_social ? 'ruc' : 'dni',
        numero_documento: testUser.documento,
        direccion: testUser.direccion,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: testUser.email,
        username: testUser.identificador,
        contrasena: await hashPassword(PASSWORD),
        estado: true,
        email_verificado: true,
      },
    });
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: rol.id, estado: true },
    });

    if (testUser.cliente) {
      await prisma.cliente.create({
        data: {
          persona_id: persona.id,
          tipo_cliente: testUser.razon_social ? 'empresa' : 'persona_natural',
          razon_social: testUser.razon_social,
          categoria_cliente: 'minorista',
          estado: testUser.cliente === 'activo',
        },
      });
    }
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    // Catálogo: mayorista y simple visibles, una inactiva y una oculta del portal.
    const categoria = await prisma.categoria.create({
      data: { nombre: CATEGORIA_NOMBRE },
    });
    const presentaciones = await Promise.all(
      [7801, 7802, 7803, 7804].map((cantidad) =>
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
    const crearPresentacion = async (
      presentacionId: number,
      data: {
        precio_unitario: number;
        precio_mayorista?: number;
        umbral_mayorista?: number;
        estado?: boolean;
        visible_portal_b: boolean;
      },
    ) =>
      (
        await prisma.productoPresentacion.create({
          data: {
            sku: `FR-P${producto.id}-PR${presentacionId}`,
            producto_id: producto.id,
            presentacion_id: presentacionId,
            ...data,
          },
        })
      ).id;

    presentacionMayoristaId = await crearPresentacion(presentaciones[0].id, {
      precio_unitario: 5.5,
      precio_mayorista: 4.2,
      umbral_mayorista: 24,
      visible_portal_b: true,
    });
    presentacionSimpleId = await crearPresentacion(presentaciones[1].id, {
      precio_unitario: 9.9,
      visible_portal_b: true,
    });
    presentacionInactivaId = await crearPresentacion(presentaciones[2].id, {
      precio_unitario: 6.9,
      estado: false,
      visible_portal_b: true,
    });
    presentacionOcultaId = await crearPresentacion(presentaciones[3].id, {
      precio_unitario: 7.9,
      visible_portal_b: false,
    });

    for (const [clave, testUser] of Object.entries(TEST_USERS)) {
      await createTestUser(testUser);
      tokens[clave as keyof typeof TEST_USERS] = await login({
        identificador: testUser.identificador,
        password: PASSWORD,
      });
    }
    tokens.admin = await login(ADMIN_CREDENTIALS);
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
    it('sin token devuelve 401', async () => {
      await resumen(payload()).expect(401);
    });

    it.each(['admin', 'ventas'] as const)(
      'con rol %s devuelve 403',
      async (rol) => {
        await resumen(payload(), tokens[rol]).expect(403);
      },
    );
  });

  describe('cálculo', () => {
    it('aplica el mayorista sobre el umbral y usa la dirección del perfil', async () => {
      const response = await resumen(payload(), tokens.cliente).expect(200);

      expect(response.body as ResumenBody).toEqual({
        tipo_entrega: 'delivery',
        direccion_perfil: DIRECCION_PERFIL,
        direccion_entrega: DIRECCION_PERFIL,
        comprobante: {
          tipo_comprobante: 'boleta',
          ruc: null,
          razon_social: null,
        },
        comprobante_sugerido: null,
        items: [
          {
            producto_presentacion_id: presentacionMayoristaId,
            cantidad: 30,
            precio_unitario: 5.5,
            precio_aplicado: 4.2,
            es_mayorista: true,
            subtotal: 126,
          },
          {
            producto_presentacion_id: presentacionSimpleId,
            cantidad: 4,
            precio_unitario: 9.9,
            precio_aplicado: 9.9,
            es_mayorista: false,
            subtotal: 39.6,
          },
        ],
        subtotal: 165.6,
        total: 165.6,
      });
    });

    it('con la cantidad igual al umbral cobra el precio unitario', async () => {
      const response = await resumen(
        payload({
          items: [
            { producto_presentacion_id: presentacionMayoristaId, cantidad: 24 },
          ],
        }),
        tokens.cliente,
      ).expect(200);
      const body = response.body as ResumenBody;

      expect(body.items[0]).toMatchObject({
        precio_aplicado: 5.5,
        es_mayorista: false,
        subtotal: 132,
      });
      expect(body.total).toBe(132);
    });

    it('usa la dirección del body solo para este pedido y no cambia el perfil', async () => {
      const response = await resumen(
        payload({ direccion_entrega: '  Av. La Marina 1450, San Miguel  ' }),
        tokens.cliente,
      ).expect(200);
      const body = response.body as ResumenBody;

      expect(body.direccion_entrega).toBe('Av. La Marina 1450, San Miguel');
      expect(body.direccion_perfil).toBe(DIRECCION_PERFIL);

      const persona = await prisma.persona.findUniqueOrThrow({
        where: { numero_documento: TEST_USERS.cliente.documento },
        select: { direccion: true },
      });
      expect(persona.direccion).toBe(DIRECCION_PERFIL);
    });

    it('en recojo en tienda no devuelve dirección de entrega', async () => {
      const response = await resumen(
        payload({ tipo_entrega: 'recojo_tienda' }),
        tokens.sinDireccion,
      ).expect(200);
      const body = response.body as ResumenBody;

      expect(body.direccion_entrega).toBeNull();
      expect(body.direccion_perfil).toBeNull();
    });

    it('no registra ningún pedido', async () => {
      await resumen(payload(), tokens.cliente).expect(200);

      const pedidos = await prisma.pedido.count({
        where: {
          cliente: {
            persona: { numero_documento: TEST_USERS.cliente.documento },
          },
        },
      });
      expect(pedidos).toBe(0);
    });
  });

  describe('tipo de comprobante (HU-B-009)', () => {
    it('con factura válida devuelve el RUC y la razón social', async () => {
      const response = await resumen(
        payload({
          comprobante: {
            tipo_comprobante: 'factura',
            ruc: RUC_FACTURA,
            razon_social: '  Comercial Huallaga E.I.R.L.  ',
          },
        }),
        tokens.cliente,
      ).expect(200);

      expect((response.body as ResumenBody).comprobante).toEqual({
        tipo_comprobante: 'factura',
        ruc: RUC_FACTURA,
        razon_social: 'Comercial Huallaga E.I.R.L.',
      });
    });

    it('con boleta ignora el RUC y la razón social aunque sean inválidos', async () => {
      const response = await resumen(
        payload({
          comprobante: {
            tipo_comprobante: 'boleta',
            ruc: '123',
            razon_social: '',
          },
        }),
        tokens.cliente,
      ).expect(200);

      expect((response.body as ResumenBody).comprobante).toEqual({
        tipo_comprobante: 'boleta',
        ruc: null,
        razon_social: null,
      });
    });

    it('propone el RUC y la razón social del perfil de una empresa', async () => {
      const response = await resumen(payload(), tokens.empresa).expect(200);
      const body = response.body as ResumenBody;

      expect(body.comprobante_sugerido).toEqual({
        ruc: RUC_EMPRESA,
        razon_social: RAZON_SOCIAL_EMPRESA,
      });
      expect(body.comprobante.tipo_comprobante).toBe('boleta');
    });

    it.each([
      ['tipo de comprobante desconocido', { tipo_comprobante: 'ticket' }],
      [
        'factura sin RUC',
        { tipo_comprobante: 'factura', razon_social: 'Comercial Huallaga' },
      ],
      [
        'factura con RUC de 10 dígitos',
        {
          tipo_comprobante: 'factura',
          ruc: '2060123456',
          razon_social: 'Comercial Huallaga',
        },
      ],
      [
        'factura con prefijo de RUC inválido',
        {
          tipo_comprobante: 'factura',
          ruc: '30601234565',
          razon_social: 'Comercial Huallaga',
        },
      ],
      [
        'factura con dígito verificador incorrecto',
        {
          tipo_comprobante: 'factura',
          ruc: '20601234566',
          razon_social: 'Comercial Huallaga',
        },
      ],
      [
        'factura sin razón social',
        { tipo_comprobante: 'factura', ruc: RUC_FACTURA },
      ],
      [
        'factura con razón social vacía',
        { tipo_comprobante: 'factura', ruc: RUC_FACTURA, razon_social: '   ' },
      ],
      [
        'factura con razón social de más de 200 caracteres',
        {
          tipo_comprobante: 'factura',
          ruc: RUC_FACTURA,
          razon_social: 'A'.repeat(201),
        },
      ],
    ])('%s devuelve 400', async (_, comprobante) => {
      await resumen(payload({ comprobante }), tokens.cliente).expect(400);
    });
  });

  describe('errores', () => {
    it('delivery sin dirección en el body ni en el perfil devuelve 400', async () => {
      await resumen(payload(), tokens.sinDireccion).expect(400);
    });

    it.each([
      ['sin productos', () => ({ items: [] })],
      [
        'cantidad menor a 1',
        () => ({
          items: [
            { producto_presentacion_id: presentacionMayoristaId, cantidad: 0 },
          ],
        }),
      ],
      [
        'presentación repetida',
        () => ({
          items: [
            { producto_presentacion_id: presentacionMayoristaId, cantidad: 1 },
            { producto_presentacion_id: presentacionMayoristaId, cantidad: 2 },
          ],
        }),
      ],
      ['tipo de entrega inválido', () => ({ tipo_entrega: 'drone' })],
      ['dirección vacía', () => ({ direccion_entrega: '   ' })],
      ['cliente_id en el body', () => ({ cliente_id: 'otro' })],
    ])('%s devuelve 400', async (_, overrides) => {
      await resumen(payload(overrides()), tokens.cliente).expect(400);
    });

    it('usuario cliente sin registro de cliente devuelve 404', async () => {
      await resumen(payload(), tokens.sinCliente).expect(404);
    });

    it('cliente inactivo devuelve 409', async () => {
      await resumen(payload(), tokens.inactivo).expect(409);
    });

    it('presentación inexistente devuelve 404', async () => {
      await resumen(
        payload({
          items: [{ producto_presentacion_id: 999999999, cantidad: 1 }],
        }),
        tokens.cliente,
      ).expect(404);
    });

    it.each([
      ['inactiva', () => presentacionInactivaId],
      ['oculta del portal', () => presentacionOcultaId],
    ])('presentación %s devuelve 409', async (_, id) => {
      await resumen(
        payload({ items: [{ producto_presentacion_id: id(), cantidad: 1 }] }),
        tokens.cliente,
      ).expect(409);
    });
  });
});
