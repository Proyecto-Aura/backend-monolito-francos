import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

// HU-A-040 Gestionar categoría. Los roles ya se prueban en catalogo.e2e-spec.ts.
const MARCA = 'E2E HU040';
const URL = '/api/v1/categorias';

interface CategoriaHttp {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
}

describe('Categorías HU-A-040 (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let adminUserId: string;
  let existingRefreshTokenIds: string[];

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });
  const crear = (body: object) =>
    request(app.getHttpServer()).post(URL).set(auth()).send(body);

  const limpiar = () =>
    prisma.categoria.deleteMany({ where: { nombre: { startsWith: MARCA } } });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await limpiar();

    const admin = await prisma.user.findUniqueOrThrow({
      where: { username: 'admin' },
      select: { id: true },
    });
    adminUserId = admin.id;
    existingRefreshTokenIds = (
      await prisma.refreshToken.findMany({
        where: { user_id: adminUserId },
        select: { id: true },
      })
    ).map((t) => t.id);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador: 'admin', password: 'admin123' });
    adminToken = (login.body as { access_token: string }).access_token;
  });

  afterAll(async () => {
    await limpiar();
    await prisma.refreshToken.deleteMany({
      where: { user_id: adminUserId, id: { notIn: existingRefreshTokenIds } },
    });
    await app.close();
  });

  it('crea una categoría activa y normaliza los espacios', async () => {
    const res = await crear({
      nombre: `  ${MARCA}   Chifles `,
      descripcion: '  Hojuelas   de plátano. ',
    }).expect(201);

    const body = res.body as CategoriaHttp;
    expect(body.nombre).toBe(`${MARCA} Chifles`);
    expect(body.descripcion).toBe('Hojuelas de plátano.');
    expect(body.estado).toBe(true);
  });

  it('rechaza un nombre repetido sin distinguir mayúsculas ni espacios (409)', async () => {
    await crear({
      nombre: `${MARCA} Camote`,
      descripcion: 'Hojuelas de camote.',
    }).expect(201);

    await crear({
      nombre: `  ${MARCA.toLowerCase()}   CAMOTE `,
      descripcion: 'Otra.',
    }).expect(409);
  });

  it('valida los datos de entrada (400)', async () => {
    await crear({ descripcion: 'Sin nombre' }).expect(400);
    await crear({ nombre: 'x'.repeat(101), descripcion: 'x' }).expect(400);
    await crear({ nombre: `${MARCA} Extra`, campo_raro: 1 }).expect(400);
  });

  it('edita nombre y descripción y evita el nombre de otra categoría', async () => {
    const a = (
      await crear({ nombre: `${MARCA} A`, descripcion: 'A' }).expect(201)
    ).body as CategoriaHttp;
    await crear({ nombre: `${MARCA} B`, descripcion: 'B' }).expect(201);

    const ok = await request(app.getHttpServer())
      .patch(`${URL}/${a.id}`)
      .set(auth())
      .send({ nombre: `${MARCA} A2`, descripcion: 'Nueva' })
      .expect(200);
    expect((ok.body as CategoriaHttp).nombre).toBe(`${MARCA} A2`);

    await request(app.getHttpServer())
      .patch(`${URL}/${a.id}`)
      .set(auth())
      .send({ nombre: `${MARCA.toLowerCase()} b` })
      .expect(409);
  });

  it('desactiva y reactiva de forma lógica y se puede filtrar por estado', async () => {
    const c = (
      await crear({ nombre: `${MARCA} Temporada`, descripcion: 'T' }).expect(
        201,
      )
    ).body as CategoriaHttp;

    const off = await request(app.getHttpServer())
      .delete(`${URL}/${c.id}`)
      .set(auth())
      .expect(200);
    expect((off.body as CategoriaHttp).estado).toBe(false);

    const inactivas = await request(app.getHttpServer())
      .get(URL)
      .query({ estado: 'false', search: MARCA, limit: 100 })
      .set(auth())
      .expect(200);
    const nombres = (inactivas.body as { data: CategoriaHttp[] }).data.map(
      (x) => x.nombre,
    );
    expect(nombres).toContain(`${MARCA} Temporada`);

    const on = await request(app.getHttpServer())
      .patch(`${URL}/${c.id}/activate`)
      .set(auth())
      .expect(200);
    expect((on.body as CategoriaHttp).estado).toBe(true);
  });

  it('devuelve 404 si la categoría no existe y 401 sin token', async () => {
    await request(app.getHttpServer())
      .patch(`${URL}/999999`)
      .set(auth())
      .send({ nombre: `${MARCA} Z` })
      .expect(404);
    await request(app.getHttpServer()).get(URL).expect(401);
  });
});
