import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

// HU-A-041 Gestionar presentaciones. Los roles ya se prueban en catalogo.e2e-spec.ts.
// Las cantidades 901 a 905 no las usa el seed (250, 500 y 1000 gr / 1 kg).
const MARCA = 'E2E HU041';
const URL = '/api/v1/presentaciones';

interface PresentacionHttp {
  id: number;
  cantidad: number;
  unidad_medida: string;
  descripcion: string | null;
  estado: boolean;
}

describe('Presentaciones HU-A-041 (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let adminUserId: string;
  let existingRefreshTokenIds: string[];

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });
  const crear = (body: object) =>
    request(app.getHttpServer()).post(URL).set(auth()).send(body);

  const limpiar = () =>
    prisma.presentacion.deleteMany({
      where: { descripcion: { startsWith: MARCA } },
    });

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

  it('crea una presentación activa y normaliza los espacios de la descripción', async () => {
    const res = await crear({
      cantidad: 901,
      unidad_medida: 'gr',
      descripcion: `  ${MARCA}   Bolsa  grande. `,
    }).expect(201);

    const body = res.body as PresentacionHttp;
    expect(body.cantidad).toBe(901);
    expect(body.unidad_medida).toBe('gr');
    expect(body.descripcion).toBe(`${MARCA} Bolsa grande.`);
    expect(body.estado).toBe(true);
  });

  it('rechaza la misma cantidad y unidad de medida (409), pero acepta la misma cantidad con otra unidad', async () => {
    await crear({
      cantidad: 902,
      unidad_medida: 'gr',
      descripcion: `${MARCA} A`,
    }).expect(201);

    await crear({
      cantidad: 902,
      unidad_medida: 'gr',
      descripcion: `${MARCA} B`,
    }).expect(409);

    await crear({
      cantidad: 902,
      unidad_medida: 'kg',
      descripcion: `${MARCA} C`,
    }).expect(201);
  });

  it('valida los datos de entrada (400)', async () => {
    const d = `${MARCA} Validación`;
    await crear({ unidad_medida: 'gr', descripcion: d }).expect(400);
    await crear({ cantidad: 0, unidad_medida: 'gr', descripcion: d }).expect(
      400,
    );
    await crear({ cantidad: -5, unidad_medida: 'gr', descripcion: d }).expect(
      400,
    );
    await crear({ cantidad: 1.5, unidad_medida: 'gr', descripcion: d }).expect(
      400,
    );
    await crear({
      cantidad: 2_000_000,
      unidad_medida: 'gr',
      descripcion: d,
    }).expect(400);
    await crear({ cantidad: 903, unidad_medida: 'lt', descripcion: d }).expect(
      400,
    );
    await crear({ cantidad: 903, descripcion: d }).expect(400);
    await crear({
      cantidad: 903,
      unidad_medida: 'gr',
      descripcion: `${MARCA} ${'x'.repeat(256)}`,
    }).expect(400);
    await crear({
      cantidad: 903,
      unidad_medida: 'gr',
      descripcion: d,
      campo_raro: 1,
    }).expect(400);
  });

  it('edita la descripción y la cantidad, y evita la combinación de otra presentación (409)', async () => {
    const a = (
      await crear({
        cantidad: 903,
        unidad_medida: 'gr',
        descripcion: `${MARCA} Editar`,
      }).expect(201)
    ).body as PresentacionHttp;
    await crear({
      cantidad: 904,
      unidad_medida: 'gr',
      descripcion: `${MARCA} Otra`,
    }).expect(201);

    const ok = await request(app.getHttpServer())
      .patch(`${URL}/${a.id}`)
      .set(auth())
      .send({ cantidad: 905, descripcion: `  ${MARCA}   Nueva ` })
      .expect(200);
    const editada = ok.body as PresentacionHttp;
    expect(editada.cantidad).toBe(905);
    expect(editada.descripcion).toBe(`${MARCA} Nueva`);

    await request(app.getHttpServer())
      .patch(`${URL}/${a.id}`)
      .set(auth())
      .send({ cantidad: 904 })
      .expect(409);
  });

  it('desactiva y reactiva de forma lógica y se puede filtrar solo por las activas', async () => {
    const p = (
      await crear({
        cantidad: 906,
        unidad_medida: 'gr',
        descripcion: `${MARCA} Temporada`,
      }).expect(201)
    ).body as PresentacionHttp;

    const off = await request(app.getHttpServer())
      .delete(`${URL}/${p.id}`)
      .set(auth())
      .expect(200);
    expect((off.body as PresentacionHttp).estado).toBe(false);

    const descripciones = async (estado: string) =>
      (
        (
          await request(app.getHttpServer())
            .get(URL)
            .query({ estado, search: MARCA, limit: 100 })
            .set(auth())
            .expect(200)
        ).body as { data: PresentacionHttp[] }
      ).data.map((x) => x.descripcion);

    expect(await descripciones('false')).toContain(`${MARCA} Temporada`);
    expect(await descripciones('true')).not.toContain(`${MARCA} Temporada`);

    const on = await request(app.getHttpServer())
      .patch(`${URL}/${p.id}/activate`)
      .set(auth())
      .expect(200);
    expect((on.body as PresentacionHttp).estado).toBe(true);
    expect(await descripciones('true')).toContain(`${MARCA} Temporada`);
  });

  it('una presentación desactivada no se puede usar en un producto nuevo (409)', async () => {
    const categoria = await prisma.categoria.findFirstOrThrow({
      where: { estado: true },
    });
    const p = (
      await crear({
        cantidad: 907,
        unidad_medida: 'gr',
        descripcion: `${MARCA} Inactiva`,
        estado: false,
      }).expect(201)
    ).body as PresentacionHttp;

    await request(app.getHttpServer())
      .post('/api/v1/productos')
      .set(auth())
      .send({
        categoria_id: categoria.id,
        nombre: `${MARCA} Producto que no se crea`,
        destacado: false,
        producto_presentaciones: [
          { presentacion_id: p.id, precio_unitario: 10 },
        ],
      })
      .expect(409);

    expect(
      await prisma.producto.count({
        where: { nombre: { startsWith: MARCA } },
      }),
    ).toBe(0);
  });

  it('devuelve 404 si la presentación no existe y 401 sin token', async () => {
    await request(app.getHttpServer())
      .patch(`${URL}/999999`)
      .set(auth())
      .send({ descripcion: `${MARCA} Z` })
      .expect(404);
    await request(app.getHttpServer()).get(URL).expect(401);
  });
});
