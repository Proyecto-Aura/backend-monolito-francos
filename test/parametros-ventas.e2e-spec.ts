import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

// HU-A-045 Gestionar parámetros de ventas (RF-A193, RF-A194, RF-A195).
const URL = '/api/v1/parametros-ventas';

interface ParametrosHttp {
  umbral_mayorista_global: number;
  umbral_por_producto: boolean;
  promociones_activas: boolean;
  culqi_activo: boolean;
  efectivo_activo: boolean;
}

describe('Parámetros de ventas HU-A-045 (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let adminUserId: string;
  let existingRefreshTokenIds: string[];
  let original: ParametrosHttp;

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });
  const leer = () => request(app.getHttpServer()).get(URL).set(auth());
  const cambiar = (body: object) =>
    request(app.getHttpServer()).patch(URL).set(auth()).send(body);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

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

    // La fila es única y compartida con otros e2e: se restaura al final.
    original = (await leer().expect(200)).body as ParametrosHttp;
  });

  afterAll(async () => {
    await cambiar({
      umbral_mayorista_global: original.umbral_mayorista_global,
      umbral_por_producto: original.umbral_por_producto,
      promociones_activas: original.promociones_activas,
      culqi_activo: original.culqi_activo,
      efectivo_activo: original.efectivo_activo,
    });
    await prisma.refreshToken.deleteMany({
      where: { user_id: adminUserId, id: { notIn: existingRefreshTokenIds } },
    });
    await app.close();
  });

  it('exige sesión (401 sin token)', async () => {
    await request(app.getHttpServer()).get(URL).expect(401);
  });

  it('parte con todo activo y el umbral global en 24', () => {
    expect(original).toMatchObject({
      umbral_mayorista_global: 24,
      umbral_por_producto: true,
      promociones_activas: true,
      culqi_activo: true,
      efectivo_activo: true,
    });
  });

  it('cambia el umbral global y lo conserva (RF-A193)', async () => {
    const res = await cambiar({
      umbral_mayorista_global: 36,
      umbral_por_producto: false,
    }).expect(200);
    expect(res.body).toMatchObject({
      umbral_mayorista_global: 36,
      umbral_por_producto: false,
    });

    const otra = (await leer().expect(200)).body as ParametrosHttp;
    expect(otra.umbral_mayorista_global).toBe(36);
    expect(otra.umbral_por_producto).toBe(false);
  });

  it('rechaza un umbral fuera de 2 a 10,000 o que no sea entero (400)', async () => {
    await cambiar({ umbral_mayorista_global: 1 }).expect(400);
    await cambiar({ umbral_mayorista_global: 10001 }).expect(400);
    await cambiar({ umbral_mayorista_global: 2.5 }).expect(400);
    await cambiar({ umbral_mayorista_global: 'muchos' }).expect(400);
    await cambiar({ campo_raro: true }).expect(400);

    const actual = (await leer().expect(200)).body as ParametrosHttp;
    expect(actual.umbral_mayorista_global).toBe(36);
  });

  it('activa y desactiva las promociones (RF-A194)', async () => {
    const off = await cambiar({ promociones_activas: false }).expect(200);
    expect((off.body as ParametrosHttp).promociones_activas).toBe(false);

    const on = await cambiar({ promociones_activas: true }).expect(200);
    expect((on.body as ParametrosHttp).promociones_activas).toBe(true);
  });

  it('apaga un método de pago pero no deja el portal sin ninguno (RF-A195)', async () => {
    await cambiar({ efectivo_activo: false }).expect(200);

    const res = await cambiar({ culqi_activo: false }).expect(400);
    expect((res.body as { message: string }).message).toBe(
      'Debe quedar al menos un método de pago activo en el portal',
    );

    await cambiar({ culqi_activo: false, efectivo_activo: false }).expect(400);

    const actual = (await leer().expect(200)).body as ParametrosHttp;
    expect(actual.culqi_activo).toBe(true);
    expect(actual.efectivo_activo).toBe(false);
  });

  it('un cambio vacío no modifica nada', async () => {
    const antes = (await leer().expect(200)).body as ParametrosHttp;
    const res = await cambiar({}).expect(200);
    expect(res.body).toMatchObject({
      umbral_mayorista_global: antes.umbral_mayorista_global,
      culqi_activo: antes.culqi_activo,
      efectivo_activo: antes.efectivo_activo,
    });
  });
});
