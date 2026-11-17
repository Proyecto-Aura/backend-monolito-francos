import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { S3Service } from '../src/infrastructure/storage/s3.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { FakeS3Service } from './fake-s3.service';

// HU-A-039: subir el logo de la empresa emisora (POST /empresa/logo).
const ADMIN_CREDENTIALS = { identificador: 'admin', password: 'admin123' };
const VENTAS = {
  identificador: 'e2e-ventas-logo',
  password: 'VentasE2e123',
  email: 'e2e-ventas-logo@francos.test',
  documento: '99994731',
};

// RUC reconocible: solo se borra la empresa que crea este archivo.
const RUC_EMISORA = '20999990474';
const URL_EMISORA = '/api/v1/empresa';
const URL_LOGO = '/api/v1/empresa/logo';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64),
]);
const JPG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(64),
]);

describe('Logo de la empresa emisora HU-A-039 (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let ventasToken: string;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  // Emisora que ya hubiera en la base: se aparta durante la prueba y se restaura.
  let emisoraPreviaId: number | null = null;
  const fakeS3Service = new FakeS3Service();

  const admin = () => ({ Authorization: `Bearer ${adminToken}` });
  const ventas = () => ({ Authorization: `Bearer ${ventasToken}` });
  const subir = (buffer: Buffer, contentType: string, filename = 'logo') =>
    request(app.getHttpServer())
      .post(URL_LOGO)
      .set(admin())
      .attach('logo', buffer, { filename, contentType });

  const login = async (identificador: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador, password });
    expect([200, 201]).toContain(res.status);
    return (res.body as { access_token: string }).access_token;
  };

  const limpiarEmpresa = () =>
    prisma.empresa.deleteMany({ where: { ruc: RUC_EMISORA } });

  const borrarUsuarioVentas = async () => {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: VENTAS.identificador }, { email: VENTAS.email }],
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
        where: { numero_documento: VENTAS.documento },
      });
    }
  };

  const crearUsuarioVentas = async () => {
    const rol = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ventas' },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Usuario',
        apellido_paterno: 'ventas',
        apellido_materno: 'Logo E2E',
        tipo_documento: 'dni',
        numero_documento: VENTAS.documento,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: VENTAS.email,
        username: VENTAS.identificador,
        contrasena: await hashPassword(VENTAS.password),
        estado: true,
        email_verificado: true,
      },
    });
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: rol.id, estado: true },
    });
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

    // Restos de una corrida anterior que haya quedado a medias.
    await limpiarEmpresa();
    await borrarUsuarioVentas();

    const previa = await prisma.empresa.findFirst({
      where: { es_emisora: true },
      select: { id: true },
    });
    if (previa) {
      emisoraPreviaId = previa.id;
      await prisma.empresa.update({
        where: { id: previa.id },
        data: { es_emisora: false },
      });
    }

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

    await crearUsuarioVentas();
    adminToken = await login(
      ADMIN_CREDENTIALS.identificador,
      ADMIN_CREDENTIALS.password,
    );
    ventasToken = await login(VENTAS.identificador, VENTAS.password);
  });

  afterAll(async () => {
    await limpiarEmpresa();
    if (emisoraPreviaId !== null) {
      await prisma.empresa.update({
        where: { id: emisoraPreviaId },
        data: { es_emisora: true },
      });
    }
    await borrarUsuarioVentas();
    await prisma.refreshToken.deleteMany({
      where: {
        user_id: adminUserId,
        id: { notIn: existingAdminRefreshTokenIds },
      },
    });
    await app.close();
  });

  it('responde 401 sin token', async () => {
    await request(app.getHttpServer())
      .post(URL_LOGO)
      .attach('logo', PNG, { filename: 'logo.png', contentType: 'image/png' })
      .expect(401);
  });

  it('responde 403 al rol ventas', async () => {
    await request(app.getHttpServer())
      .post(URL_LOGO)
      .set(ventas())
      .attach('logo', PNG, { filename: 'logo.png', contentType: 'image/png' })
      .expect(403);
  });

  it('responde 404 si aún no hay empresa emisora', async () => {
    const res = await subir(PNG, 'image/png', 'logo.png').expect(404);
    expect((res.body as { message: string }).message).toBe(
      'Registra primero los datos de la empresa',
    );
  });

  describe('con empresa emisora registrada', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .put(URL_EMISORA)
        .set(admin())
        .send({
          razon_social: 'E2E OFT0-473 Logo',
          ruc: RUC_EMISORA,
          direccion: 'Av. Logo 100',
        })
        .expect(200);
    });

    it('sube un PNG real a media y GET /empresa devuelve el logo_url', async () => {
      const res = await subir(PNG, 'image/png', 'logo.png').expect(201);
      const { logo_url } = res.body as { logo_url: string };
      expect(logo_url).toMatch(/\/empresa\/[0-9a-f-]{36}\.png$/);

      const key = logo_url.slice(logo_url.indexOf('empresa/'));
      expect(fakeS3Service.objeto('media', key)).toMatchObject({
        contentType: 'image/png',
      });

      const get = await request(app.getHttpServer())
        .get(URL_EMISORA)
        .set(admin())
        .expect(200);
      expect((get.body as { logo_url: string }).logo_url).toBe(logo_url);
    });

    it('sube un JPG y reemplaza el logo anterior', async () => {
      const antes = await request(app.getHttpServer())
        .get(URL_EMISORA)
        .set(admin())
        .expect(200);

      const res = await subir(JPG, 'image/jpeg', 'logo.jpg').expect(201);
      const { logo_url } = res.body as { logo_url: string };
      expect(logo_url).toMatch(/\.jpg$/);
      expect(logo_url).not.toBe((antes.body as { logo_url: string }).logo_url);
    });

    it('PUT /empresa conserva el logo ya subido', async () => {
      const antes = await request(app.getHttpServer())
        .get(URL_EMISORA)
        .set(admin())
        .expect(200);
      const logo = (antes.body as { logo_url: string }).logo_url;
      expect(logo).toBeTruthy();

      await request(app.getHttpServer())
        .put(URL_EMISORA)
        .set(admin())
        .send({
          razon_social: 'E2E OFT0-473 Logo Editada',
          ruc: RUC_EMISORA,
          direccion: 'Av. Logo 200',
        })
        .expect(200);

      const despues = await request(app.getHttpServer())
        .get(URL_EMISORA)
        .set(admin())
        .expect(200);
      expect(despues.body).toMatchObject({
        razon_social: 'E2E OFT0-473 Logo Editada',
        logo_url: logo,
      });
    });

    it('PUT /empresa rechaza logo_url (400)', async () => {
      await request(app.getHttpServer())
        .put(URL_EMISORA)
        .set(admin())
        .send({
          razon_social: 'E2E OFT0-473 Logo',
          ruc: RUC_EMISORA,
          direccion: 'Av. Logo 200',
          logo_url: 'https://cdn.francos.test/logo.png',
        })
        .expect(400);
    });

    it('400 si el archivo es texto aunque diga image/png', async () => {
      const res = await subir(
        Buffer.from('esto no es una imagen'),
        'image/png',
        'logo.png',
      ).expect(400);
      expect((res.body as { message: string }).message).toBe(
        'El logo debe ser PNG o JPG',
      );
    });

    it('400 si supera 1 MB', async () => {
      const grande = Buffer.concat([PNG, Buffer.alloc(1024 * 1024)]);
      const res = await subir(grande, 'image/png', 'logo.png').expect(400);
      expect((res.body as { message: string }).message).toBe(
        'El logo no debe superar 1 MB',
      );
    });

    it('400 si no se envía archivo', async () => {
      await request(app.getHttpServer())
        .post(URL_LOGO)
        .set(admin())
        .expect(400);
    });

    it('DELETE /empresa/logo deja logo_url en null (y 401/403 sin permiso)', async () => {
      await request(app.getHttpServer()).delete(URL_LOGO).expect(401);
      await request(app.getHttpServer())
        .delete(URL_LOGO)
        .set(ventas())
        .expect(403);

      const res = await request(app.getHttpServer())
        .delete(URL_LOGO)
        .set(admin())
        .expect(200);
      expect((res.body as { logo_url: string | null }).logo_url).toBeNull();

      const get = await request(app.getHttpServer())
        .get(URL_EMISORA)
        .set(admin())
        .expect(200);
      expect((get.body as { logo_url: string | null }).logo_url).toBeNull();
    });
  });
});
