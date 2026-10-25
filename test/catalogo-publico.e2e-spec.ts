import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getStorageToken, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { envs } from '../src/config/envs';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import {
  fechaHoy,
  parseFechaDia,
} from '../src/modules/catalog/application/utils/promocion.utils';

// Marcas para reconocer (y borrar) solo los datos que crea este archivo.
const PREFIJO = 'E2E-521';
const SLUG_PREFIJO = 'e2e-521';
const UN_DIA_MS = 24 * 60 * 60 * 1000;

interface ItemHttp {
  id: number;
  producto_id: number;
  nombre: string;
  categoria: { id: number; nombre: string };
  precio: number;
  precio_final: number;
  disponible: boolean;
  promocion: { tipo: string; descripcion: string } | null;
}

interface ListadoHttp {
  data: ItemHttp[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

interface DetalleHttp {
  id: number;
  nombre: string;
  categoria: { id: number; nombre: string };
  presentaciones: Array<Omit<ItemHttp, 'producto_id' | 'nombre' | 'categoria'>>;
}

// Campos internos que el catálogo público nunca debe devolver.
const CAMPOS_INTERNOS = [
  'sku',
  'visible_portal_b',
  'stock_actual',
  'stock_minimo',
  'stock_maximo',
  'producto_terminado',
  'created_at',
  'updated_at',
  'estado',
  'precio_mayorista',
  'umbral_mayorista',
];

const clavesProfundas = (valor: unknown): string[] => {
  if (Array.isArray(valor)) {
    return valor.flatMap(clavesProfundas);
  }
  if (valor && typeof valor === 'object') {
    return Object.entries(valor).flatMap(([clave, hijo]) => [
      clave,
      ...clavesProfundas(hijo),
    ]);
  }
  return [];
};

describe('Catálogo público (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let throttlerStorage: ThrottlerStorageService;

  // Ids de los datos de prueba.
  const ids = {
    categoriaA: 0,
    categoriaB: 0,
    categoriaInactiva: 0,
    productoAlfa: 0,
    productoBeta: 0,
    productoInactivo: 0,
    productoCategoriaInactiva: 0,
    productoPresentacionInactiva: 0,
    productoOculto: 0,
    // Presentaciones visibles.
    alfa10: 0,
    alfa30: 0,
    beta20: 0,
  };

  const listar = (query: Record<string, string | number> = {}) =>
    request(app.getHttpServer())
      .get('/api/v1/catalogo/productos')
      .query({ q: PREFIJO, ...query });

  // Vacía el contador del rate limit para que cada prueba empiece de cero.
  const reiniciarRateLimit = () => throttlerStorage.onApplicationShutdown();

  const deleteTestData = async () => {
    const productos = await prisma.producto.findMany({
      where: { nombre: { startsWith: PREFIJO } },
      select: { id: true },
    });
    const productoIds = productos.map(({ id }) => id);
    const presentaciones = await prisma.productoPresentacion.findMany({
      where: { producto_id: { in: productoIds } },
      select: { id: true },
    });
    const ppIds = presentaciones.map(({ id }) => id);

    await prisma.promocion.deleteMany({
      where: { producto_presentacion_id: { in: ppIds } },
    });
    await prisma.productoTerminado.deleteMany({
      where: { producto_presentacion_id: { in: ppIds } },
    });
    await prisma.productoPresentacion.deleteMany({
      where: { id: { in: ppIds } },
    });
    await prisma.producto.deleteMany({ where: { id: { in: productoIds } } });
    await prisma.presentacion.deleteMany({ where: { descripcion: PREFIJO } });
    await prisma.categoria.deleteMany({
      where: { nombre: { startsWith: PREFIJO } },
    });
  };

  const crearPresentacionProducto = async (params: {
    producto_id: number;
    presentacion_id: number;
    sufijo: string;
    precio: number;
    estado?: boolean;
    stock?: number;
  }) => {
    const pp = await prisma.productoPresentacion.create({
      data: {
        sku: `${SLUG_PREFIJO}-${params.sufijo}`,
        slug: `${SLUG_PREFIJO}-${params.sufijo}`,
        precio_unitario: params.precio,
        producto_id: params.producto_id,
        presentacion_id: params.presentacion_id,
        // Lo único que decide si se ve en el Portal B es el estado (HU-A-008).
        estado: params.estado ?? true,
        producto_terminado: { create: { stock_actual: params.stock ?? 5 } },
      },
    });
    return pp.id;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    throttlerStorage = app.get<ThrottlerStorageService>(getStorageToken());

    // Limpia restos de una corrida anterior que haya quedado a medias.
    await deleteTestData();

    const [categoriaA, categoriaB, categoriaInactiva] = await Promise.all([
      prisma.categoria.create({ data: { nombre: `${PREFIJO} Categoría A` } }),
      prisma.categoria.create({ data: { nombre: `${PREFIJO} Categoría B` } }),
      prisma.categoria.create({
        data: { nombre: `${PREFIJO} Categoría inactiva`, estado: false },
      }),
    ]);
    ids.categoriaA = categoriaA.id;
    ids.categoriaB = categoriaB.id;
    ids.categoriaInactiva = categoriaInactiva.id;

    const [p200, p500] = await Promise.all([
      prisma.presentacion.create({
        data: { cantidad: 200, unidad_medida: 'gr', descripcion: PREFIJO },
      }),
      prisma.presentacion.create({
        data: { cantidad: 500, unidad_medida: 'gr', descripcion: PREFIJO },
      }),
    ]);

    const crearProducto = (
      nombre: string,
      categoria_id: number,
      extra: { estado?: boolean; destacado?: boolean } = {},
    ) =>
      prisma.producto
        .create({
          data: {
            nombre: `${PREFIJO} ${nombre}`,
            descripcion: `Descripción de ${nombre}`,
            categoria_id,
            ...extra,
          },
        })
        .then(({ id }) => id);

    ids.productoAlfa = await crearProducto('Alfa chifles', categoriaA.id);
    ids.productoBeta = await crearProducto('Beta camote', categoriaB.id, {
      destacado: true,
    });
    ids.productoInactivo = await crearProducto(
      'Gamma inactivo',
      categoriaA.id,
      { estado: false },
    );
    ids.productoCategoriaInactiva = await crearProducto(
      'Delta categoría inactiva',
      categoriaInactiva.id,
    );
    ids.productoPresentacionInactiva = await crearProducto(
      'Epsilon presentación inactiva',
      categoriaA.id,
    );
    ids.productoOculto = await crearProducto('Zeta oculto', categoriaA.id);

    ids.alfa10 = await crearPresentacionProducto({
      producto_id: ids.productoAlfa,
      presentacion_id: p200.id,
      sufijo: 'alfa-200',
      precio: 10,
    });
    ids.alfa30 = await crearPresentacionProducto({
      producto_id: ids.productoAlfa,
      presentacion_id: p500.id,
      sufijo: 'alfa-500',
      precio: 30,
      stock: 0,
    });
    ids.beta20 = await crearPresentacionProducto({
      producto_id: ids.productoBeta,
      presentacion_id: p200.id,
      sufijo: 'beta-200',
      precio: 20,
    });
    // Ninguna de estas debe verse en el Portal B.
    await crearPresentacionProducto({
      producto_id: ids.productoAlfa,
      presentacion_id: (
        await prisma.presentacion.create({
          data: { cantidad: 1, unidad_medida: 'kg', descripcion: PREFIJO },
        })
      ).id,
      sufijo: 'alfa-1kg-oculta',
      precio: 5,
      estado: false,
    });
    await crearPresentacionProducto({
      producto_id: ids.productoInactivo,
      presentacion_id: p200.id,
      sufijo: 'gamma-200',
      precio: 11,
    });
    await crearPresentacionProducto({
      producto_id: ids.productoCategoriaInactiva,
      presentacion_id: p200.id,
      sufijo: 'delta-200',
      precio: 12,
    });
    await crearPresentacionProducto({
      producto_id: ids.productoPresentacionInactiva,
      presentacion_id: p200.id,
      sufijo: 'epsilon-200',
      precio: 13,
      estado: false,
    });
    await crearPresentacionProducto({
      producto_id: ids.productoOculto,
      presentacion_id: p200.id,
      sufijo: 'zeta-200',
      precio: 14,
      estado: false,
    });

    const hoy = parseFechaDia(fechaHoy());
    const ayer = new Date(hoy.getTime() - UN_DIA_MS);
    const manana = new Date(hoy.getTime() + UN_DIA_MS);

    await prisma.promocion.createMany({
      data: [
        {
          producto_presentacion_id: ids.alfa10,
          nombre: `${PREFIJO} 20%`,
          tipo: 'porcentaje',
          valor: 20,
          fecha_inicio: ayer,
          fecha_fin: manana,
        },
        // Vencida: no debe aparecer.
        {
          producto_presentacion_id: ids.alfa30,
          nombre: `${PREFIJO} vencida`,
          tipo: 'porcentaje',
          valor: 50,
          fecha_inicio: parseFechaDia('2020-01-01'),
          fecha_fin: parseFechaDia('2020-01-31'),
        },
        {
          producto_presentacion_id: ids.beta20,
          nombre: `${PREFIJO} 2x1`,
          tipo: 'nxm',
          valor: 0,
          cantidad_lleva: 2,
          cantidad_paga: 1,
          fecha_inicio: hoy,
          fecha_fin: hoy,
        },
      ],
    });
  });

  beforeEach(() => {
    reiniciarRateLimit();
  });

  afterAll(async () => {
    await deleteTestData();
    await app.close();
  });

  describe('GET /api/v1/catalogo/productos', () => {
    it('responde 200 sin token y solo con las presentaciones visibles', async () => {
      const response = await listar().expect(200);
      const body = response.body as ListadoHttp;

      expect(body.data.map(({ id }) => id).sort()).toEqual(
        [ids.alfa10, ids.alfa30, ids.beta20].sort(),
      );
      expect(body.meta).toEqual({
        total: 3,
        page: 1,
        limit: 10,
        total_pages: 1,
      });
    });

    it('ignora un token inválido porque el endpoint es público', async () => {
      await listar()
        .set('Authorization', 'Bearer token-que-no-es-valido')
        .expect(200);
    });

    it('muestra nombre, categoría, precio, promoción y disponibilidad', async () => {
      const response = await listar().expect(200);
      const body = response.body as ListadoHttp;
      const alfa10 = body.data.find(({ id }) => id === ids.alfa10);
      const alfa30 = body.data.find(({ id }) => id === ids.alfa30);
      const beta20 = body.data.find(({ id }) => id === ids.beta20);

      expect(alfa10).toMatchObject({
        producto_id: ids.productoAlfa,
        nombre: `${PREFIJO} Alfa chifles`,
        descripcion: 'Descripción de Alfa chifles',
        categoria: { id: ids.categoriaA, nombre: `${PREFIJO} Categoría A` },
        presentacion: { cantidad: 200, unidad_medida: 'gr' },
        imagen_url: null,
        precio: 10,
        precio_final: 8,
        disponible: true,
        promocion: { tipo: 'porcentaje', descripcion: '20% de descuento' },
      });
      // Promoción vencida y sin stock.
      expect(alfa30).toMatchObject({
        precio: 30,
        precio_final: 30,
        disponible: false,
        promocion: null,
      });
      // nxm: se describe, pero el precio unitario no cambia.
      expect(beta20).toMatchObject({
        precio: 20,
        precio_final: 20,
        promocion: { tipo: 'nxm', descripcion: '2x1' },
      });
    });

    it('no expone datos internos', async () => {
      const response = await listar().expect(200);
      const claves = clavesProfundas(response.body);

      for (const campo of CAMPOS_INTERNOS) {
        expect(claves).not.toContain(campo);
      }
    });

    it('por defecto ordena primero los destacados y luego por nombre', async () => {
      const response = await listar().expect(200);

      expect((response.body as ListadoHttp).data.map(({ id }) => id)).toEqual([
        ids.beta20,
        ids.alfa10,
        ids.alfa30,
      ]);
    });

    it('ordena por precio ascendente y descendente', async () => {
      const asc = await listar({ orden: 'precio_asc' }).expect(200);
      const desc = await listar({ orden: 'precio_desc' }).expect(200);

      expect((asc.body as ListadoHttp).data.map(({ id }) => id)).toEqual([
        ids.alfa10,
        ids.beta20,
        ids.alfa30,
      ]);
      expect((desc.body as ListadoHttp).data.map(({ id }) => id)).toEqual([
        ids.alfa30,
        ids.beta20,
        ids.alfa10,
      ]);
    });

    it('filtra por categoría', async () => {
      const response = await listar({ categoria_id: ids.categoriaB }).expect(
        200,
      );

      expect((response.body as ListadoHttp).data.map(({ id }) => id)).toEqual([
        ids.beta20,
      ]);
    });

    it('busca por nombre de producto sin distinguir mayúsculas, y no por sku', async () => {
      const porNombre = await listar({ q: 'e2e-521 BETA' }).expect(200);
      const porSku = await listar({ q: `${SLUG_PREFIJO}-alfa-200` }).expect(
        200,
      );

      expect((porNombre.body as ListadoHttp).data.map(({ id }) => id)).toEqual([
        ids.beta20,
      ]);
      expect((porSku.body as ListadoHttp).data).toEqual([]);
    });

    it('pagina con page y limit', async () => {
      const response = await listar({ page: 2, limit: 2 }).expect(200);
      const body = response.body as ListadoHttp;

      expect(body.data.map(({ id }) => id)).toEqual([ids.alfa30]);
      expect(body.meta).toEqual({
        total: 3,
        page: 2,
        limit: 2,
        total_pages: 2,
      });
    });

    it.each([
      ['limit mayor que 100', { limit: 101 }],
      ['orden desconocido', { orden: 'nombre' }],
      ['categoria_id no numérico', { categoria_id: 'abc' }],
      ['el filtro estado (no lo elige el cliente)', { estado: 'false' }],
      ['el filtro visible_portal_b', { visible_portal_b: 'false' }],
    ])('responde 400 con %s', async (_caso, query) => {
      await listar(query).expect(400);
    });
  });

  describe('GET /api/v1/catalogo/productos/:id', () => {
    it('devuelve el producto con sus presentaciones visibles ordenadas por precio', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/catalogo/productos/${ids.productoAlfa}`)
        .expect(200);
      const body = response.body as DetalleHttp;

      expect(body).toMatchObject({
        id: ids.productoAlfa,
        nombre: `${PREFIJO} Alfa chifles`,
        categoria: { id: ids.categoriaA },
      });
      // La presentación oculta (1 kg) no sale.
      expect(body.presentaciones).toHaveLength(2);
      expect(body.presentaciones[0]).toMatchObject({
        id: ids.alfa10,
        precio: 10,
        precio_final: 8,
        disponible: true,
        promocion: { tipo: 'porcentaje' },
      });
      expect(body.presentaciones[1]).toMatchObject({
        id: ids.alfa30,
        precio_final: 30,
        disponible: false,
        promocion: null,
      });

      const claves = clavesProfundas(body);
      for (const campo of CAMPOS_INTERNOS) {
        expect(claves).not.toContain(campo);
      }
    });

    it('incluye la promoción nxm vigente hoy', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/catalogo/productos/${ids.productoBeta}`)
        .expect(200);

      expect((response.body as DetalleHttp).presentaciones).toEqual([
        expect.objectContaining({
          id: ids.beta20,
          precio_final: 20,
          promocion: expect.objectContaining({
            tipo: 'nxm',
            descripcion: '2x1',
            cantidad_lleva: 2,
            cantidad_paga: 1,
          }) as unknown,
        }),
      ]);
    });

    it.each([
      ['inactivo', () => ids.productoInactivo],
      ['de una categoría inactiva', () => ids.productoCategoriaInactiva],
      ['sin presentaciones activas', () => ids.productoPresentacionInactiva],
      ['oculto del Portal B', () => ids.productoOculto],
      ['inexistente', () => 2147483000],
    ])('responde 404 si el producto está %s', async (_caso, id) => {
      await request(app.getHttpServer())
        .get(`/api/v1/catalogo/productos/${id()}`)
        .expect(404);
    });

    it('responde 400 si el id no es un número', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/catalogo/productos/abc')
        .expect(400);
    });
  });

  describe('rate limit', () => {
    it(`responde 429 al superar ${envs.catalogoPublicoRateLimit} peticiones en la ventana`, async () => {
      const limite = envs.catalogoPublicoRateLimit;

      for (let i = 0; i < limite; i++) {
        const response = await request(app.getHttpServer())
          .get('/api/v1/catalogo/productos')
          .query({ q: PREFIJO, limit: 1 });
        expect(response.status).toBe(200);
        expect(response.headers['x-ratelimit-limit']).toBe(String(limite));
      }

      const bloqueada = await request(app.getHttpServer())
        .get('/api/v1/catalogo/productos')
        .query({ q: PREFIJO, limit: 1 })
        .expect(429);
      expect(bloqueada.headers['retry-after']).toBeDefined();
    });

    it('no limita los endpoints internos, que siguen exigiendo token', async () => {
      await request(app.getHttpServer()).get('/api/v1/productos').expect(401);
    });
  });
});
