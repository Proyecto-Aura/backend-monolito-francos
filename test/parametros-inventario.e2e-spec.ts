import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

// HU-A-046 Gestionar parámetros de inventario (RF-A196): el admin configura el
// stock mínimo de alerta por producto terminado o insumo. Los endpoints de
// edición ya existen (PATCH /insumos/:id y PATCH /productos-terminados/:id);
// acá se valida el flujo completo desde el rol admin y la ruta del menú.
const MARCA = 'E2E OFT0-288';
const API = '/api/v1';

interface NodoMenu {
  nombre: string;
  children: NodoMenu[];
}

interface InsumoHttp {
  id: number;
  stock_minimo: number | string;
}

interface ProductoHttp {
  producto_presentaciones: { id: number }[];
}

interface PresentacionListadoHttp {
  id: number;
  producto_terminado: { stock_minimo: number | string } | null;
}

describe('Parámetros de inventario HU-A-046 (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let insumoId: number;
  let productoPresentacionId: number;

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  const limpiarDatos = async () => {
    const productos = await prisma.producto.findMany({
      where: { nombre: { startsWith: MARCA } },
      select: { id: true },
    });
    const ids = productos.map((p) => p.id);
    await prisma.productoTerminado.deleteMany({
      where: { producto_presentacion: { producto_id: { in: ids } } },
    });
    await prisma.productoPresentacion.deleteMany({
      where: { producto_id: { in: ids } },
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
    await prisma.insumo.deleteMany({
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

    const login = await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ identificador: 'admin', password: 'admin123' });
    adminToken = (login.body as { access_token: string }).access_token;

    insumoId = (
      (
        await request(app.getHttpServer())
          .post(`${API}/insumos`)
          .set(auth())
          .send({
            nombre: `${MARCA} Harina`,
            unidad_medida: 'kg',
            stock_minimo: 10,
            stock_maximo: 500,
            tipo: 'materia_prima',
          })
          .expect(201)
      ).body as InsumoHttp
    ).id;

    const categoria = (
      await request(app.getHttpServer())
        .post(`${API}/categorias`)
        .set(auth())
        .send({ nombre: `${MARCA} Panadería` })
        .expect(201)
    ).body as { id: number };
    const presentacion = (
      await request(app.getHttpServer())
        .post(`${API}/presentaciones`)
        .set(auth())
        .send({
          cantidad: 9288,
          unidad_medida: 'gr',
          descripcion: `${MARCA} Bolsa 9288gr`,
        })
        .expect(201)
    ).body as { id: number };
    const producto = (
      await request(app.getHttpServer())
        .post(`${API}/productos`)
        .set(auth())
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
    await app.close();
  });

  it('el admin ve "Parámetros de inventario" dentro de Configuración', async () => {
    const res = await request(app.getHttpServer())
      .get(`${API}/rutas/mi-menu`)
      .set(auth())
      .expect(200);
    const configuracion = (res.body as NodoMenu[]).find(
      (n) => n.nombre === 'configuracion',
    );

    expect(configuracion?.children.map((c) => c.nombre)).toContain(
      'parametros-inventario',
    );
  });

  describe('stock mínimo de un insumo', () => {
    const url = () => `${API}/insumos/${insumoId}`;

    it('el admin lo cambia y el listado ya lo devuelve actualizado', async () => {
      await request(app.getHttpServer())
        .patch(url())
        .set(auth())
        .send({ stock_minimo: 25 })
        .expect(200);

      const lista = await request(app.getHttpServer())
        .get(`${API}/insumos`)
        .query({ search: MARCA })
        .set(auth())
        .expect(200);
      const fila = (lista.body as { data: InsumoHttp[] }).data.find(
        (i) => i.id === insumoId,
      );
      expect(Number(fila?.stock_minimo)).toBe(25);
    });

    it('el admin cambia mínimo y máximo juntos', async () => {
      const res = await request(app.getHttpServer())
        .patch(url())
        .set(auth())
        .send({ stock_minimo: 30, stock_maximo: 700 })
        .expect(200);
      const body = res.body as InsumoHttp & { stock_maximo: number | string };

      expect(Number(body.stock_minimo)).toBe(30);
      expect(Number(body.stock_maximo)).toBe(700);
    });

    it('el listado filtra por nivel (con stock 0 el insumo está agotado)', async () => {
      const lista = await request(app.getHttpServer())
        .get(`${API}/insumos`)
        .query({ search: MARCA, nivel: 'agotado' })
        .set(auth())
        .expect(200);

      expect(
        (lista.body as { data: InsumoHttp[] }).data.map((i) => i.id),
      ).toContain(insumoId);
    });

    it('un valor negativo devuelve 400', async () => {
      await request(app.getHttpServer())
        .patch(url())
        .set(auth())
        .send({ stock_minimo: -1 })
        .expect(400);
    });

    it('un máximo de 0 devuelve 400 (los niveles dividen entre el máximo)', async () => {
      await request(app.getHttpServer())
        .patch(url())
        .set(auth())
        .send({ stock_minimo: 0, stock_maximo: 0 })
        .expect(400);
    });

    it('un valor mayor al stock máximo devuelve 409', async () => {
      await request(app.getHttpServer())
        .patch(url())
        .set(auth())
        .send({ stock_minimo: 701 })
        .expect(409);
    });

    it('sin token devuelve 401', async () => {
      await request(app.getHttpServer())
        .patch(url())
        .send({ stock_minimo: 5 })
        .expect(401);
    });
  });

  describe('stock mínimo de un producto terminado', () => {
    const url = () => `${API}/productos-terminados/${productoPresentacionId}`;

    it('el admin lo cambia y el listado del catálogo ya lo devuelve actualizado', async () => {
      await request(app.getHttpServer())
        .patch(url())
        .set(auth())
        .send({ stock_minimo: 15 })
        .expect(200);

      const lista = await request(app.getHttpServer())
        .get(`${API}/producto-presentaciones`)
        .query({ search: MARCA })
        .set(auth())
        .expect(200);
      const fila = (
        lista.body as { data: PresentacionListadoHttp[] }
      ).data.find((p) => p.id === productoPresentacionId);
      expect(Number(fila?.producto_terminado?.stock_minimo)).toBe(15);
    });

    it('el admin fija un tope y luego lo quita con null', async () => {
      const conTope = await request(app.getHttpServer())
        .patch(url())
        .set(auth())
        .send({ stock_minimo: 15, stock_maximo: 200 })
        .expect(200);
      expect(
        Number((conTope.body as { stock_maximo: number }).stock_maximo),
      ).toBe(200);

      const sinTope = await request(app.getHttpServer())
        .patch(url())
        .set(auth())
        .send({ stock_minimo: 15, stock_maximo: null })
        .expect(200);
      expect(
        (sinTope.body as { stock_maximo: number | null }).stock_maximo,
      ).toBeNull();
    });

    it('un máximo de 0 devuelve 400 y el filtro por nivel sigue respondiendo', async () => {
      await request(app.getHttpServer())
        .patch(url())
        .set(auth())
        .send({ stock_minimo: 0, stock_maximo: 0 })
        .expect(400);

      await request(app.getHttpServer())
        .get(`${API}/producto-presentaciones`)
        .query({ nivel: 'normal' })
        .set(auth())
        .expect(200);
    });

    it('un máximo menor al mínimo devuelve 409', async () => {
      await request(app.getHttpServer())
        .patch(url())
        .set(auth())
        .send({ stock_minimo: 50, stock_maximo: 10 })
        .expect(409);
    });

    it('un valor negativo devuelve 400', async () => {
      await request(app.getHttpServer())
        .patch(url())
        .set(auth())
        .send({ stock_minimo: -5 })
        .expect(400);
    });

    it('una producto-presentación inexistente devuelve 404', async () => {
      await request(app.getHttpServer())
        .patch(`${API}/productos-terminados/999999999`)
        .set(auth())
        .send({ stock_minimo: 5 })
        .expect(404);
    });
  });
});
