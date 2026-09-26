import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import request from 'supertest';
import { App } from 'supertest/types';

const ADMIN_CREDENTIALS = {
  identificador: 'admin',
  password: 'admin123',
};
const VENTAS_CREDENTIALS = {
  identificador: 'e2e-ventas-guards',
  password: 'VentasE2e123',
};
const VENTAS_EMAIL = 'e2e-ventas-guards@francos.test';
const VENTAS_DOCUMENTO = '99999998';

describe('Auth guards (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let ventasToken: string;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];

  const login = async (credentials: typeof ADMIN_CREDENTIALS) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(credentials);

    expect([200, 201]).toContain(response.status);
    expect(response.body).toHaveProperty('access_token');
    const body = response.body as unknown as { access_token: string };
    return body.access_token;
  };

  const deleteVentasUser = async () => {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: VENTAS_CREDENTIALS.identificador },
          { email: VENTAS_EMAIL },
        ],
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
        where: { numero_documento: VENTAS_DOCUMENTO },
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

    await deleteVentasUser();
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

    const ventasRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ventas' },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Usuario',
        apellido_paterno: 'Ventas',
        apellido_materno: 'E2E',
        tipo_documento: 'dni',
        numero_documento: VENTAS_DOCUMENTO,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: VENTAS_EMAIL,
        username: VENTAS_CREDENTIALS.identificador,
        contrasena: await hashPassword(VENTAS_CREDENTIALS.password),
        estado: true,
        email_verificado: true,
      },
    });
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: ventasRole.id, estado: true },
    });

    adminToken = await login(ADMIN_CREDENTIALS);
    ventasToken = await login(VENTAS_CREDENTIALS);
  });

  afterAll(async () => {
    await deleteVentasUser();
    await prisma.refreshToken.deleteMany({
      where: {
        user_id: adminUserId,
        id: { notIn: existingAdminRefreshTokenIds },
      },
    });
    await app.close();
  });

  it('GET /api/v1/roles sin token devuelve 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/roles').expect(401);
  });

  it('GET /api/v1/roles con rol ventas devuelve 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${ventasToken}`)
      .expect(403);
  });

  it('GET /api/v1/roles con rol admin devuelve 200', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('POST /api/v1/auth/login sigue siendo público', async () => {
    await login(ADMIN_CREDENTIALS);
  });

  it('GET /api/v1/productos permite el rol ventas', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/productos')
      .set('Authorization', `Bearer ${ventasToken}`)
      .expect(200);
  });

  it('Swagger muestra candado solo en las rutas protegidas de auth', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    expect(document.paths['/api/v1/roles']?.get?.security).toEqual([
      { bearer: [] },
    ]);
    expect(document.paths['/api/v1/productos']?.get?.security).toEqual([
      { bearer: [] },
    ]);
    expect(
      document.paths['/api/v1/auth/register/cliente']?.post?.security,
    ).toEqual([{ bearer: [] }]);
    expect(
      document.paths['/api/v1/auth/register/empleado']?.post?.security,
    ).toEqual([{ bearer: [] }]);

    for (const path of ['login', 'register', 'refresh', 'logout']) {
      expect(
        document.paths[`/api/v1/auth/${path}`]?.post?.security,
      ).toBeUndefined();
    }
  });
});
