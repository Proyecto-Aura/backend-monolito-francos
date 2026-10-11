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
  identificador: 'e2e-ventas-objetivo-estrategico',
  password: 'VentasE2e123',
};
const ESTRATEGICO_CREDENTIALS = {
  identificador: 'e2e-estrategico-objetivo-estrategico',
  password: 'EstrategicoE2e123',
};
const VENTAS_EMAIL = 'e2e-ventas-objetivo-estrategico@francos.test';
const ESTRATEGICO_EMAIL = 'e2e-estrategico-objetivo-estrategico@francos.test';
const VENTAS_DOCUMENTO = '99999996';
const ESTRATEGICO_DOCUMENTO = '99999995';
const PLAN_PREFIX = 'OE E2E OFT0-421';
const PLAN_A_NAME = `${PLAN_PREFIX} Plan A Borrador`;
const PLAN_B_NAME = `${PLAN_PREFIX} Plan B Activo`;

interface ObjetivoHttp {
  id: number;
  descripcion: string | null;
  estado_objetivo: { codigo: string };
  relaciones_destino_ids: number[];
}

interface ResumenPlanHttp {
  plan: { estado_plan: { codigo: string } };
  total_objetivos: number;
}

describe('Objetivo estratégico (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let ventasToken: string;
  let estrategicoToken: string;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[] = [];
  let existingActivePlanIds: number[] = [];
  let perspectivaFinancieraId: number;
  let perspectivaClienteId: number;
  let planAId: number;
  let planBId: number;
  let objetivoAId: number;
  let objetivoBId: number;
  let objetivoCId: number;
  let objetivoDId: number;

  const login = async (credentials: typeof ADMIN_CREDENTIALS) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(credentials);

    expect([200, 201]).toContain(response.status);
    expect(response.body).toHaveProperty('access_token');
    return (response.body as { access_token: string }).access_token;
  };

  const deleteTestUser = async (
    credentials: typeof ADMIN_CREDENTIALS,
    email: string,
    documento: string,
  ) => {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: credentials.identificador }, { email }],
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
      return;
    }

    await prisma.persona.deleteMany({ where: { numero_documento: documento } });
  };

  const createTestUser = async (
    credentials: typeof ADMIN_CREDENTIALS,
    email: string,
    documento: string,
    rolNombre: string,
  ) => {
    const rol = await prisma.rol.findUniqueOrThrow({
      where: { nombre: rolNombre },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Usuario',
        apellido_paterno: rolNombre,
        apellido_materno: 'Objetivo E2E',
        tipo_documento: 'dni',
        numero_documento: documento,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email,
        username: credentials.identificador,
        contrasena: await hashPassword(credentials.password),
        estado: true,
        email_verificado: true,
      },
    });
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: rol.id, estado: true },
    });
  };

  const deleteTestPlans = async () => {
    const planIds = (
      await prisma.planEstrategico.findMany({
        where: { nombre: { startsWith: PLAN_PREFIX } },
        select: { id: true },
      })
    ).map(({ id }) => id);

    if (planIds.length === 0) {
      return;
    }

    await prisma.$transaction([
      prisma.relacionOe.deleteMany({
        where: {
          OR: [
            { origen: { plan_estrategico_id: { in: planIds } } },
            { destino: { plan_estrategico_id: { in: planIds } } },
          ],
        },
      }),
      prisma.objetivoEstrategico.deleteMany({
        where: { plan_estrategico_id: { in: planIds } },
      }),
      prisma.planEstrategico.deleteMany({ where: { id: { in: planIds } } }),
    ]);
  };

  const createPlan = async (nombre: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/planes-estrategicos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre, anio_inicio: 2035, anio_fin: 2038 })
      .expect(201);

    return (response.body as { id: number }).id;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    await deleteTestPlans();
    await deleteTestUser(VENTAS_CREDENTIALS, VENTAS_EMAIL, VENTAS_DOCUMENTO);
    await deleteTestUser(
      ESTRATEGICO_CREDENTIALS,
      ESTRATEGICO_EMAIL,
      ESTRATEGICO_DOCUMENTO,
    );

    existingActivePlanIds = (
      await prisma.planEstrategico.findMany({
        where: { estado: true, estado_plan: { codigo: 'ACTIVO' } },
        select: { id: true },
      })
    ).map(({ id }) => id);

    if (existingActivePlanIds.length > 0) {
      await prisma.planEstrategico.updateMany({
        where: { id: { in: existingActivePlanIds } },
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

    const perspectivaFinanciera = await prisma.perspectivaBsc.findFirstOrThrow({
      where: { nombre: 'Financiera' },
    });
    const perspectivaCliente = await prisma.perspectivaBsc.findFirstOrThrow({
      where: { nombre: 'Cliente' },
    });
    perspectivaFinancieraId = perspectivaFinanciera.id;
    perspectivaClienteId = perspectivaCliente.id;

    await createTestUser(
      VENTAS_CREDENTIALS,
      VENTAS_EMAIL,
      VENTAS_DOCUMENTO,
      'ventas',
    );
    await createTestUser(
      ESTRATEGICO_CREDENTIALS,
      ESTRATEGICO_EMAIL,
      ESTRATEGICO_DOCUMENTO,
      'estrategico',
    );

    adminToken = await login(ADMIN_CREDENTIALS);
    ventasToken = await login(VENTAS_CREDENTIALS);
    estrategicoToken = await login(ESTRATEGICO_CREDENTIALS);
    planAId = await createPlan(PLAN_A_NAME);
    planBId = await createPlan(PLAN_B_NAME);
  });

  afterAll(async () => {
    await deleteTestPlans();

    if (existingActivePlanIds.length > 0) {
      await prisma.planEstrategico.updateMany({
        where: { id: { in: existingActivePlanIds } },
        data: { estado: true },
      });
    }

    await deleteTestUser(VENTAS_CREDENTIALS, VENTAS_EMAIL, VENTAS_DOCUMENTO);
    await deleteTestUser(
      ESTRATEGICO_CREDENTIALS,
      ESTRATEGICO_EMAIL,
      ESTRATEGICO_DOCUMENTO,
    );
    await prisma.refreshToken.deleteMany({
      where: {
        user_id: adminUserId,
        id: { notIn: existingAdminRefreshTokenIds },
      },
    });

    const [planes, objetivos, relaciones, usuarios, personas] =
      await Promise.all([
        prisma.planEstrategico.count({
          where: { nombre: { startsWith: PLAN_PREFIX } },
        }),
        prisma.objetivoEstrategico.count({
          where: {
            plan_estrategico: { nombre: { startsWith: PLAN_PREFIX } },
          },
        }),
        prisma.relacionOe.count({
          where: {
            OR: [
              {
                origen: {
                  plan_estrategico: { nombre: { startsWith: PLAN_PREFIX } },
                },
              },
              {
                destino: {
                  plan_estrategico: { nombre: { startsWith: PLAN_PREFIX } },
                },
              },
            ],
          },
        }),
        prisma.user.count({
          where: {
            username: {
              in: [
                VENTAS_CREDENTIALS.identificador,
                ESTRATEGICO_CREDENTIALS.identificador,
              ],
            },
          },
        }),
        prisma.persona.count({
          where: {
            numero_documento: {
              in: [VENTAS_DOCUMENTO, ESTRATEGICO_DOCUMENTO],
            },
          },
        }),
      ]);

    expect({ planes, objetivos, relaciones, usuarios, personas }).toEqual({
      planes: 0,
      objetivos: 0,
      relaciones: 0,
      usuarios: 0,
      personas: 0,
    });
    await app.close();
  });

  it('POST /api/v1/objetivos-estrategicos sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos')
      .send({
        plan_estrategico_id: planAId,
        perspectiva_bsc_id: perspectivaFinancieraId,
        responsable: 'Responsable E2E',
        nombre: `${PLAN_PREFIX} sin token`,
      })
      .expect(401);
  });

  it('POST /api/v1/objetivos-estrategicos con rol ventas devuelve 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos')
      .set('Authorization', `Bearer ${ventasToken}`)
      .send({
        plan_estrategico_id: planAId,
        perspectiva_bsc_id: perspectivaFinancieraId,
        responsable: 'Responsable E2E',
        nombre: `${PLAN_PREFIX} sin permisos`,
      })
      .expect(403);
  });

  it('POST /api/v1/objetivos-estrategicos sin responsable devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan_estrategico_id: planAId,
        perspectiva_bsc_id: perspectivaFinancieraId,
        nombre: `${PLAN_PREFIX} sin responsable`,
      })
      .expect(400);
  });

  it('crea el objetivo A sin descripción, en estado PENDIENTE', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan_estrategico_id: planAId,
        perspectiva_bsc_id: perspectivaFinancieraId,
        responsable: 'Responsable A',
        nombre: `${PLAN_PREFIX} Objetivo A`,
      })
      .expect(201);

    const objetivoCreado = response.body as ObjetivoHttp;
    expect(objetivoCreado.descripcion).toBeNull();
    expect(objetivoCreado.estado_objetivo.codigo).toBe('PENDIENTE');
    objetivoAId = objetivoCreado.id;
  });

  it('crea el objetivo B del Plan A en otra perspectiva', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan_estrategico_id: planAId,
        perspectiva_bsc_id: perspectivaClienteId,
        responsable: 'Responsable B',
        nombre: `${PLAN_PREFIX} Objetivo B`,
      })
      .expect(201);

    objetivoBId = (response.body as { id: number }).id;
  });

  it('crea la relación A hacia B', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos/${objetivoAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ relaciones_destino_ids: [objetivoBId] })
      .expect(200);

    const objetivoActualizado = response.body as ObjetivoHttp;
    expect(objetivoActualizado.relaciones_destino_ids).toContain(objetivoBId);
  });

  it('preserva las relaciones al actualizar sin relaciones_destino_ids', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos/${objetivoAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ responsable: 'Responsable A actualizado' })
      .expect(200);

    const objetivoActualizado = response.body as ObjetivoHttp;
    expect(objetivoActualizado.relaciones_destino_ids).toContain(objetivoBId);
  });

  it('crea el objetivo C del Plan A', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan_estrategico_id: planAId,
        perspectiva_bsc_id: perspectivaFinancieraId,
        responsable: 'Responsable C',
        nombre: `${PLAN_PREFIX} Objetivo C`,
      })
      .expect(201);

    objetivoCId = (response.body as { id: number }).id;
  });

  it('crea la relación C hacia A', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos/${objetivoCId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ relaciones_destino_ids: [objetivoAId] })
      .expect(200);

    const objetivoActualizado = response.body as ObjetivoHttp;
    expect(objetivoActualizado.relaciones_destino_ids).toContain(objetivoAId);
  });

  it('rechaza el ciclo A-B-C-A al intentar crear B hacia C', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos/${objetivoBId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ relaciones_destino_ids: [objetivoCId] })
      .expect(409);
  });

  it('lista los tres objetivos activos del Plan A agrupados por perspectiva', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/objetivos-estrategicos?plan_estrategico_id=${planAId}&limit=20`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = response.body as {
      data: { objetivos: { id: number }[] }[];
    };
    const ids = data.data.flatMap((grupo) =>
      grupo.objetivos.map((objetivo) => objetivo.id),
    );
    expect(ids).toEqual(
      expect.arrayContaining([objetivoAId, objetivoBId, objetivoCId]),
    );
  });

  it('rechaza GET /todos para el rol estrategico', async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/objetivos-estrategicos/todos?plan_estrategico_id=${planAId}`,
      )
      .set('Authorization', `Bearer ${estrategicoToken}`)
      .expect(403);
  });

  it('permite GET /todos para el rol admin', async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/objetivos-estrategicos/todos?plan_estrategico_id=${planAId}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('devuelve el resumen del Plan A con sus tres objetivos', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/planes-estrategicos/${planAId}/objetivos-estrategicos`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const resumen = response.body as ResumenPlanHttp;
    expect(resumen.plan.estado_plan.codigo).toBe('BORRADOR');
    expect(resumen.total_objetivos).toBe(3);
  });

  it('elimina la relación C hacia A', async () => {
    const relacion = await prisma.relacionOe.findFirstOrThrow({
      where: { origen_id: objetivoCId, destino_id: objetivoAId, estado: true },
      select: { id: true },
    });

    const response = await request(app.getHttpServer())
      .delete(
        `/api/v1/objetivos-estrategicos/${objetivoCId}/relaciones/${relacion.id}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const objetivoActualizado = response.body as ObjetivoHttp;
    expect(objetivoActualizado.relaciones_destino_ids).not.toContain(
      objetivoAId,
    );
  });

  it('elimina lógicamente el objetivo C sin relaciones', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/objetivos-estrategicos/${objetivoCId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('devuelve 404 al consultar el objetivo C eliminado', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/objetivos-estrategicos/${objetivoCId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('crea el objetivo D en el Plan B en estado PENDIENTE', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan_estrategico_id: planBId,
        perspectiva_bsc_id: perspectivaFinancieraId,
        responsable: 'Responsable D',
        nombre: `${PLAN_PREFIX} Objetivo D`,
      })
      .expect(201);

    const objetivoCreado = response.body as ObjetivoHttp;
    expect(objetivoCreado.estado_objetivo.codigo).toBe('PENDIENTE');
    objetivoDId = objetivoCreado.id;
  });

  it('activa el Plan B', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planBId}/activar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('rechaza crear objetivos en el Plan B activo', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan_estrategico_id: planBId,
        perspectiva_bsc_id: perspectivaClienteId,
        responsable: 'Responsable bloqueado',
        nombre: `${PLAN_PREFIX} Objetivo bloqueado`,
      })
      .expect(409);
  });

  it('rechaza el salto de PENDIENTE a CUMPLIDO', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos/${objetivoDId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'CUMPLIDO' })
      .expect(409);
  });

  it('permite la transición PENDIENTE a EN_PROCESO', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos/${objetivoDId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'EN_PROCESO' })
      .expect(200);

    const objetivoActualizado = response.body as ObjetivoHttp;
    expect(objetivoActualizado.estado_objetivo.codigo).toBe('EN_PROCESO');
  });

  it('permite la transición EN_PROCESO a CUMPLIDO', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos/${objetivoDId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'CUMPLIDO' })
      .expect(200);

    const objetivoActualizado = response.body as ObjetivoHttp;
    expect(objetivoActualizado.estado_objetivo.codigo).toBe('CUMPLIDO');
  });

  it('rechaza una transición desde CUMPLIDO a CANCELADO', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos/${objetivoDId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'CANCELADO' })
      .expect(409);
  });

  it('rechaza eliminar el objetivo D mientras su plan está Activo', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/objetivos-estrategicos/${objetivoDId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('Swagger documenta seguridad bearer en GET de objetivos estratégicos', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    expect(
      document.paths['/api/v1/objetivos-estrategicos']?.get?.security,
    ).toEqual([{ bearer: [] }]);
  });
});
