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
  identificador: 'e2e-ventas-plan-estrategico',
  password: 'VentasE2e123',
};
const VENTAS_EMAIL = 'e2e-ventas-plan-estrategico@francos.test';
const VENTAS_DOCUMENTO = '99999997';
const PLAN_NAME = 'Plan Estratégico E2E OFT0-417';

describe('Plan estratégico (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let ventasToken: string;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  let createdPlanId: number;
  let existingActivePlanId: number | undefined;

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

  const deleteTestPlans = async () => {
    await prisma.planEstrategico.deleteMany({
      where: {
        OR: [
          { nombre: PLAN_NAME },
          ...(createdPlanId ? [{ id: createdPlanId }] : []),
        ],
      },
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

    await deleteVentasUser();
    await deleteTestPlans();
    const existingActivePlan = await prisma.planEstrategico.findFirst({
      where: { estado: true, estado_plan: { codigo: 'ACTIVO' } },
      select: { id: true },
    });
    existingActivePlanId = existingActivePlan?.id;

    if (existingActivePlanId !== undefined) {
      await prisma.planEstrategico.update({
        where: { id: existingActivePlanId },
        data: { estado: false },
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

    const ventasRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ventas' },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Usuario',
        apellido_paterno: 'Ventas',
        apellido_materno: 'Plan E2E',
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
    await deleteTestPlans();

    if (existingActivePlanId !== undefined) {
      await prisma.planEstrategico.update({
        where: { id: existingActivePlanId },
        data: { estado: true },
      });
    }

    await deleteVentasUser();
    await prisma.refreshToken.deleteMany({
      where: {
        user_id: adminUserId,
        id: { notIn: existingAdminRefreshTokenIds },
      },
    });
    await app.close();
  });

  it('POST /api/v1/planes-estrategicos sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/planes-estrategicos')
      .send({ nombre: PLAN_NAME, anio_inicio: 2026, anio_fin: 2030 })
      .expect(401);
  });

  it('GET /api/v1/planes-estrategicos con rol ventas devuelve 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/planes-estrategicos')
      .set('Authorization', `Bearer ${ventasToken}`)
      .expect(403);
  });

  it('POST /api/v1/planes-estrategicos con rol admin devuelve 201', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/planes-estrategicos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: PLAN_NAME, anio_inicio: 2026, anio_fin: 2030 })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    const body = response.body as unknown as { id: number };
    createdPlanId = body.id;
  });

  it('PATCH /api/v1/planes-estrategicos/:id/activar devuelve 200', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${createdPlanId}/activar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('PATCH /api/v1/planes-estrategicos/:id activo devuelve 409', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${createdPlanId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: `${PLAN_NAME} actualizado` })
      .expect(409);
  });

  it('DELETE /api/v1/planes-estrategicos/:id activo devuelve 409', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/planes-estrategicos/${createdPlanId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('PATCH /api/v1/planes-estrategicos/:id/cerrar devuelve 200', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${createdPlanId}/cerrar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('Swagger muestra seguridad bearer en POST de planes estratégicos', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    expect(
      document.paths['/api/v1/planes-estrategicos']?.post?.security,
    ).toEqual([{ bearer: [] }]);
  });
});
