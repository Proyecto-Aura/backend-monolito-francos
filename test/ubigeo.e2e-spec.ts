import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

const ADMIN = { identificador: 'admin', password: 'admin123' };

interface ItemHttp {
  id: string;
  nombre: string;
}

describe('Ubigeo (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];

  const http = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    adminUserId = (
      await prisma.user.findUniqueOrThrow({
        where: { username: ADMIN.identificador },
        select: { id: true },
      })
    ).id;
    existingAdminRefreshTokenIds = (
      await prisma.refreshToken.findMany({
        where: { user_id: adminUserId },
        select: { id: true },
      })
    ).map(({ id }) => id);

    const res = await http().post('/api/v1/auth/login').send(ADMIN).expect(201);
    token = (res.body as { access_token: string }).access_token;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: {
        user_id: adminUserId,
        id: { notIn: existingAdminRefreshTokenIds },
      },
    });
    await app.close();
  }, 30_000);

  it('sin token devuelve 401', async () => {
    await http().get('/api/v1/ubigeo/departamentos').expect(401);
  });

  it('lista los departamentos ordenados por nombre', async () => {
    const res = await http()
      .get('/api/v1/ubigeo/departamentos')
      .set(auth())
      .expect(200);
    const departamentos = res.body as ItemHttp[];

    expect(departamentos).toEqual(
      expect.arrayContaining([
        { id: '07', nombre: 'Callao' },
        { id: '15', nombre: 'Lima' },
      ]),
    );
    const nombres = departamentos.map((d) => d.nombre);
    expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b)));
  });

  it('lista las provincias de un departamento', async () => {
    const res = await http()
      .get('/api/v1/ubigeo/provincias')
      .query({ departamento_id: '15' })
      .set(auth())
      .expect(200);

    expect(res.body).toEqual(
      expect.arrayContaining([{ id: '1501', nombre: 'Lima' }]),
    );
  });

  it('lista los distritos de una provincia', async () => {
    const res = await http()
      .get('/api/v1/ubigeo/distritos')
      .query({ provincia_id: '1501' })
      .set(auth())
      .expect(200);
    const distritos = res.body as ItemHttp[];

    expect(distritos).toHaveLength(43);
    expect(distritos).toEqual(
      expect.arrayContaining([{ id: '150131', nombre: 'San Isidro' }]),
    );
  });

  it('devuelve 400 sin el código padre o con un formato inválido', async () => {
    await http().get('/api/v1/ubigeo/provincias').set(auth()).expect(400);
    await http()
      .get('/api/v1/ubigeo/distritos')
      .query({ provincia_id: 'x' })
      .set(auth())
      .expect(400);
  });
});
