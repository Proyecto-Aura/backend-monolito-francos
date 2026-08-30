import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Productos (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('GET /api/v1/productos permite consultar el catálogo', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/productos')
      .expect(200);
    const body = response.body as unknown as {
      data: unknown[];
      meta: { total: number; page: number; limit: number };
    };

    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.meta.total).toBe('number');
    expect(typeof body.meta.page).toBe('number');
    expect(typeof body.meta.limit).toBe('number');
  });

  it('POST /api/v1/productos rechaza escrituras sin token', () => {
    return request(app.getHttpServer()).post('/api/v1/productos').expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
