import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';

const ADMIN_CREDENTIALS = {
  identificador: 'admin',
  password: 'admin123',
};
const VENTAS_CREDENTIALS = {
  identificador: 'e2e-ventas-objetivo-estrategico-ti',
  password: 'VentasObjetivoTiE2e123',
};
const ESTRATEGICO_CREDENTIALS = {
  identificador: 'e2e-estrategico-objetivo-estrategico-ti',
  password: 'EstrategicoObjetivoTiE2e123',
};
const VENTAS_EMAIL = 'e2e-ventas-objetivo-estrategico-ti@francos.test';
const ESTRATEGICO_EMAIL =
  'e2e-estrategico-objetivo-estrategico-ti@francos.test';
const VENTAS_DOCUMENTO = '99999990';
const ESTRATEGICO_DOCUMENTO = '99999989';
const PLAN_PREFIX = 'OE-TI E2E OFT0-449';
const PLAN_A_NAME = `${PLAN_PREFIX} Plan A Borrador`;
const PLAN_C_NAME = `${PLAN_PREFIX} Plan C Borrador`;
const PLAN_D_NAME = `${PLAN_PREFIX} Plan D Flujo`;

interface ObjetivoHttp {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estado_objetivo: { codigo: string };
  relaciones_destino_ids: number[];
  oe_negocio_id?: number;
  oe_negocio?: { id: number; codigo: string; nombre: string };
}

interface IniciativaHttp {
  id: number;
  estado_iniciativa: { codigo: string };
}

interface ResumenPlanHttp {
  plan: { estado_plan: { codigo: string } };
  total_objetivos: number;
}

describe('Objetivo estratégico TI (e2e)', () => {
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
  let planCId: number;
  let planDId: number;
  let oeNegA: ObjetivoHttp;
  let oeNegOtroPlan: ObjetivoHttp;
  let oeNegNuevo: ObjetivoHttp;
  let oeNegA2: ObjetivoHttp;
  let objetivoTiAId: number;
  let objetivoTiBId: number;
  let objetivoTiDId: number;
  let objetivoTiEId: number;
  let iniciativaPendienteId: number;
  let iniciativaEnProcesoId: number;
  let iniciativaCompletadaId: number;

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
        apellido_materno: 'Objetivo TI E2E',
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
      prisma.iniciativa.deleteMany({
        where: {
          objetivo_estrategico: { plan_estrategico_id: { in: planIds } },
        },
      }),
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

  const createPlan = async (
    nombre: string,
    anioInicio: number,
    anioFin: number,
  ) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/planes-estrategicos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre, anio_inicio: anioInicio, anio_fin: anioFin })
      .expect(201);

    return (response.body as { id: number }).id;
  };

  const createObjetivoNegocio = async (
    planId: number,
    perspectivaId: number,
    nombre: string,
  ) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan_estrategico_id: planId,
        perspectiva_bsc_id: perspectivaId,
        responsable: 'Responsable Negocio E2E',
        nombre,
      })
      .expect(201);

    return response.body as ObjetivoHttp;
  };

  const createObjetivoTi = async (
    planId: number,
    oeNegocioId: number,
    nombre: string,
    perspectivaId = perspectivaFinancieraId,
  ) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan_estrategico_id: planId,
        perspectiva_bsc_id: perspectivaId,
        oe_negocio_id: oeNegocioId,
        responsable: 'Responsable TI E2E',
        nombre,
      })
      .expect(201);

    return response.body as ObjetivoHttp;
  };

  const createIniciativa = async (nombre: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/iniciativas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        objetivo_estrategico_id: objetivoTiDId,
        nombre,
        descripcion: 'Iniciativa para cascada de cancelación',
        responsable: 'Responsable Iniciativa E2E',
        fecha_inicio: '2060-01-15',
        fecha_fin: '2061-12-15',
      })
      .expect(201);

    return (response.body as IniciativaHttp).id;
  };

  const getEstadoIniciativa = async (id: number) => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/iniciativas?objetivo_estrategico_id=${objetivoTiDId}&limit=20`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const iniciativas = (response.body as { data: IniciativaHttp[] }).data;
    return iniciativas.find((iniciativa) => iniciativa.id === id)
      ?.estado_iniciativa.codigo;
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
    planAId = await createPlan(PLAN_A_NAME, 2055, 2058);
    planCId = await createPlan(PLAN_C_NAME, 2055, 2058);
    oeNegA = await createObjetivoNegocio(
      planAId,
      perspectivaFinancieraId,
      `${PLAN_PREFIX} OE Negocio A`,
    );
    oeNegOtroPlan = await createObjetivoNegocio(
      planCId,
      perspectivaFinancieraId,
      `${PLAN_PREFIX} OE Negocio otro plan`,
    );
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

    const [planes, objetivos, iniciativas, relaciones, usuarios, personas] =
      await Promise.all([
        prisma.planEstrategico.count({
          where: { nombre: { startsWith: PLAN_PREFIX } },
        }),
        prisma.objetivoEstrategico.count({
          where: {
            plan_estrategico: { nombre: { startsWith: PLAN_PREFIX } },
          },
        }),
        prisma.iniciativa.count({
          where: {
            objetivo_estrategico: {
              plan_estrategico: { nombre: { startsWith: PLAN_PREFIX } },
            },
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

    expect({
      planes,
      objetivos,
      iniciativas,
      relaciones,
      usuarios,
      personas,
    }).toEqual({
      planes: 0,
      objetivos: 0,
      iniciativas: 0,
      relaciones: 0,
      usuarios: 0,
      personas: 0,
    });
    await app.close();
  });

  it('1. POST /api/v1/objetivos-estrategicos-ti sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos-ti')
      .send({
        plan_estrategico_id: planAId,
        perspectiva_bsc_id: perspectivaFinancieraId,
        oe_negocio_id: oeNegA.id,
        responsable: 'Responsable TI',
        nombre: `${PLAN_PREFIX} sin token`,
      })
      .expect(401);
  });

  it('2. POST /api/v1/objetivos-estrategicos-ti con rol ventas devuelve 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos-ti')
      .set('Authorization', `Bearer ${ventasToken}`)
      .send({
        plan_estrategico_id: planAId,
        perspectiva_bsc_id: perspectivaFinancieraId,
        oe_negocio_id: oeNegA.id,
        responsable: 'Responsable TI',
        nombre: `${PLAN_PREFIX} sin permisos`,
      })
      .expect(403);
  });

  it('3. rechaza crear un objetivo TI sin oe_negocio_id', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan_estrategico_id: planAId,
        perspectiva_bsc_id: perspectivaFinancieraId,
        responsable: 'Responsable TI',
        nombre: `${PLAN_PREFIX} sin vínculo`,
      })
      .expect(400);
  });

  it('4. rechaza vincular un objetivo TI con otro objetivo TI', async () => {
    const objetivoTiAncla = await createObjetivoTi(
      planCId,
      oeNegOtroPlan.id,
      `${PLAN_PREFIX} TI ancla`,
    );

    const response = await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan_estrategico_id: planAId,
        perspectiva_bsc_id: perspectivaFinancieraId,
        oe_negocio_id: objetivoTiAncla.id,
        responsable: 'Responsable TI',
        nombre: `${PLAN_PREFIX} vínculo TI inválido`,
      })
      .expect(409);

    expect((response.body as { message: string }).message).toBe(
      'El objetivo vinculado debe ser un objetivo estratégico de Negocio',
    );
  });

  it('5. rechaza vincular un objetivo NEG de otro plan', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan_estrategico_id: planAId,
        perspectiva_bsc_id: perspectivaFinancieraId,
        oe_negocio_id: oeNegOtroPlan.id,
        responsable: 'Responsable TI',
        nombre: `${PLAN_PREFIX} vínculo de otro plan`,
      })
      .expect(409);

    expect((response.body as { message: string }).message).toContain(
      'debe pertenecer al mismo plan',
    );
  });

  it('6. crea el primer objetivo TI con su objetivo NEG enriquecido', async () => {
    const objetivo = await createObjetivoTi(
      planAId,
      oeNegA.id,
      `${PLAN_PREFIX} Objetivo TI A`,
    );

    objetivoTiAId = objetivo.id;
    expect(objetivo.estado_objetivo.codigo).toBe('PENDIENTE');
    expect(objetivo.codigo).toMatch(/-OE-TI-001$/);
    expect(objetivo.oe_negocio).toEqual({
      id: oeNegA.id,
      codigo: oeNegA.codigo,
      nombre: oeNegA.nombre,
    });
  });

  it('7. crea el segundo objetivo TI con correlativo independiente', async () => {
    const objetivo = await createObjetivoTi(
      planAId,
      oeNegA.id,
      `${PLAN_PREFIX} Objetivo TI B`,
      perspectivaClienteId,
    );

    objetivoTiBId = objetivo.id;
    expect(objetivo.codigo).toMatch(/-OE-TI-002$/);
  });

  it('8. mantiene el formato y la respuesta de un objetivo NEG nuevo', async () => {
    oeNegNuevo = await createObjetivoNegocio(
      planAId,
      perspectivaClienteId,
      `${PLAN_PREFIX} OE Negocio nuevo`,
    );

    expect(oeNegNuevo.codigo).toMatch(/-OE-N-00\d$/);
    expect(oeNegNuevo).not.toHaveProperty('oe_negocio');
    expect(oeNegNuevo).not.toHaveProperty('oe_negocio_id');
  });

  it('9. rechaza con 400 limpiar oe_negocio_id mediante null', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos-ti/${objetivoTiAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ oe_negocio_id: null })
      .expect(400);

    expect(JSON.stringify(response.body)).toContain('oe_negocio_id');
  });

  it('10. preserva el vínculo al editar sin oe_negocio_id', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos-ti/${objetivoTiAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ responsable: 'Responsable TI actualizado' })
      .expect(200);

    expect((response.body as ObjetivoHttp).oe_negocio?.id).toBe(oeNegA.id);
  });

  it('11. cambia el vínculo a otro objetivo NEG válido del mismo plan', async () => {
    oeNegA2 = await createObjetivoNegocio(
      planAId,
      perspectivaFinancieraId,
      `${PLAN_PREFIX} OE Negocio A2`,
    );

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos-ti/${objetivoTiAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ oe_negocio_id: oeNegA2.id })
      .expect(200);

    expect((response.body as ObjetivoHttp).oe_negocio).toEqual({
      id: oeNegA2.id,
      codigo: oeNegA2.codigo,
      nombre: oeNegA2.nombre,
    });
  });

  it('12. rechaza un vínculo inválido al editar y conserva el anterior', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos-ti/${objetivoTiAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ oe_negocio_id: oeNegOtroPlan.id })
      .expect(409);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/objetivos-estrategicos-ti/${objetivoTiAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((response.body as ObjetivoHttp).oe_negocio?.id).toBe(oeNegA2.id);
  });

  it('13. lista solo los objetivos TI activos del Plan A', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/objetivos-estrategicos-ti?plan_estrategico_id=${planAId}&limit=20`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = response.body as {
      data: { objetivos: { id: number }[] }[];
    };
    const ids = data.data.flatMap((grupo) =>
      grupo.objetivos.map((objetivo) => objetivo.id),
    );
    expect(ids).toEqual(expect.arrayContaining([objetivoTiAId, objetivoTiBId]));
    expect(ids).not.toEqual(
      expect.arrayContaining([oeNegA.id, oeNegNuevo.id, oeNegA2.id]),
    );
  });

  it('14. restringe GET /todos a admin', async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/objetivos-estrategicos-ti/todos?plan_estrategico_id=${planAId}`,
      )
      .set('Authorization', `Bearer ${estrategicoToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(
        `/api/v1/objetivos-estrategicos-ti/todos?plan_estrategico_id=${planAId}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('15. resume únicamente los dos objetivos TI del Plan A', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/planes-estrategicos/${planAId}/objetivos-estrategicos-ti`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const resumen = response.body as ResumenPlanHttp;
    expect(resumen.plan.estado_plan.codigo).toBe('BORRADOR');
    expect(resumen.total_objetivos).toBe(2);
  });

  it('16. mantiene separado el resumen de objetivos NEG del Plan A', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/planes-estrategicos/${planAId}/objetivos-estrategicos`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((response.body as ResumenPlanHttp).total_objetivos).toBe(3);
  });

  it('17. crea una relación causa-efecto entre los objetivos TI', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos-ti/${objetivoTiAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ relaciones_destino_ids: [objetivoTiBId] })
      .expect(200);

    expect((response.body as ObjetivoHttp).relaciones_destino_ids).toContain(
      objetivoTiBId,
    );
  });

  it('18. rechaza eliminar un objetivo TI con una relación activa', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/v1/objetivos-estrategicos-ti/${objetivoTiAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    expect((response.body as { message: string }).message).toBe(
      'No se puede eliminar un objetivo con KPIs, iniciativas o relaciones asociadas',
    );
  });

  it('19. elimina la relación y luego elimina lógicamente el objetivo TI', async () => {
    const relacion = await prisma.relacionOe.findFirstOrThrow({
      where: {
        origen_id: objetivoTiAId,
        destino_id: objetivoTiBId,
        estado: true,
      },
      select: { id: true },
    });

    await request(app.getHttpServer())
      .delete(
        `/api/v1/objetivos-estrategicos-ti/${objetivoTiAId}/relaciones/${relacion.id}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/objetivos-estrategicos-ti/${objetivoTiAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('20. devuelve 404 al consultar el objetivo TI eliminado', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/objetivos-estrategicos-ti/${objetivoTiAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('21. crea los objetivos TI para estado y gates en un plan Borrador', async () => {
    planDId = await createPlan(PLAN_D_NAME, 2060, 2061);
    const oeNegD = await createObjetivoNegocio(
      planDId,
      perspectivaFinancieraId,
      `${PLAN_PREFIX} OE Negocio D`,
    );
    const objetivoTiD = await createObjetivoTi(
      planDId,
      oeNegD.id,
      `${PLAN_PREFIX} Objetivo TI D`,
    );
    const objetivoTiE = await createObjetivoTi(
      planDId,
      oeNegD.id,
      `${PLAN_PREFIX} Objetivo TI E`,
      perspectivaClienteId,
    );

    objetivoTiDId = objetivoTiD.id;
    objetivoTiEId = objetivoTiE.id;
    expect(objetivoTiD.estado_objetivo.codigo).toBe('PENDIENTE');
    expect(objetivoTiE.estado_objetivo.codigo).toBe('PENDIENTE');
  });

  it('22. crea tres iniciativas sobre el objetivo TI', async () => {
    iniciativaPendienteId = await createIniciativa(
      `${PLAN_PREFIX} Iniciativa Pendiente`,
    );
    iniciativaEnProcesoId = await createIniciativa(
      `${PLAN_PREFIX} Iniciativa En Proceso`,
    );
    iniciativaCompletadaId = await createIniciativa(
      `${PLAN_PREFIX} Iniciativa Completada`,
    );

    expect([
      iniciativaPendienteId,
      iniciativaEnProcesoId,
      iniciativaCompletadaId,
    ]).toEqual([expect.any(Number), expect.any(Number), expect.any(Number)]);
  });

  it('23. activa el Plan D', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planDId}/activar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      (response.body as { estado_plan: { codigo: string } }).estado_plan.codigo,
    ).toBe('ACTIVO');
  });

  it('24. pasa una iniciativa a EN_PROCESO', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaEnProcesoId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'EN_PROCESO' })
      .expect(200);

    expect((response.body as IniciativaHttp).estado_iniciativa.codigo).toBe(
      'EN_PROCESO',
    );
  });

  it('25. pasa otra iniciativa de PENDIENTE a COMPLETADA en dos pasos', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaCompletadaId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'EN_PROCESO' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaCompletadaId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'COMPLETADA' })
      .expect(200);

    expect((response.body as IniciativaHttp).estado_iniciativa.codigo).toBe(
      'COMPLETADA',
    );
  });

  it('26. deja una iniciativa sin tocar en PENDIENTE', async () => {
    await expect(getEstadoIniciativa(iniciativaPendienteId)).resolves.toBe(
      'PENDIENTE',
    );
  });

  it('27. confirma los tres estados antes de cancelar el objetivo TI', async () => {
    await expect(getEstadoIniciativa(iniciativaPendienteId)).resolves.toBe(
      'PENDIENTE',
    );
    await expect(getEstadoIniciativa(iniciativaEnProcesoId)).resolves.toBe(
      'EN_PROCESO',
    );
    await expect(getEstadoIniciativa(iniciativaCompletadaId)).resolves.toBe(
      'COMPLETADA',
    );
  });

  it('28. cancela el objetivo TI directamente desde PENDIENTE', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos-ti/${objetivoTiDId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'CANCELADO' })
      .expect(200);

    expect((response.body as ObjetivoHttp).estado_objetivo.codigo).toBe(
      'CANCELADO',
    );
  });

  it('29. cancela en cascada la iniciativa PENDIENTE', async () => {
    await expect(getEstadoIniciativa(iniciativaPendienteId)).resolves.toBe(
      'CANCELADA',
    );
  });

  it('30. cancela en cascada la iniciativa EN_PROCESO', async () => {
    await expect(getEstadoIniciativa(iniciativaEnProcesoId)).resolves.toBe(
      'CANCELADA',
    );
  });

  it('31. conserva COMPLETADA la iniciativa ya terminada', async () => {
    await expect(getEstadoIniciativa(iniciativaCompletadaId)).resolves.toBe(
      'COMPLETADA',
    );
  });

  it('32. rechaza crear un objetivo TI nuevo en el Plan D Activo', async () => {
    const oeNegD = await prisma.objetivoEstrategico.findFirstOrThrow({
      where: {
        plan_estrategico_id: planDId,
        tipo_modulo: { codigo: 'NEG' },
      },
      select: { id: true },
    });

    await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan_estrategico_id: planDId,
        perspectiva_bsc_id: perspectivaFinancieraId,
        oe_negocio_id: oeNegD.id,
        responsable: 'Responsable bloqueado',
        nombre: `${PLAN_PREFIX} Objetivo TI bloqueado`,
      })
      .expect(409);
  });

  it('33. rechaza el salto PENDIENTE a CUMPLIDO en el objetivo TI', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos-ti/${objetivoTiEId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'CUMPLIDO' })
      .expect(409);
  });

  it('34. permite PENDIENTE a EN_PROCESO en el objetivo TI', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos-ti/${objetivoTiEId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'EN_PROCESO' })
      .expect(200);

    expect((response.body as ObjetivoHttp).estado_objetivo.codigo).toBe(
      'EN_PROCESO',
    );
  });

  it('35. permite EN_PROCESO a CUMPLIDO en el objetivo TI', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos-ti/${objetivoTiEId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'CUMPLIDO' })
      .expect(200);

    expect((response.body as ObjetivoHttp).estado_objetivo.codigo).toBe(
      'CUMPLIDO',
    );
  });

  it('36. rechaza CUMPLIDO a CANCELADO en el objetivo TI', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/objetivos-estrategicos-ti/${objetivoTiEId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'CANCELADO' })
      .expect(409);
  });

  it('37. rechaza eliminar el objetivo TI mientras el plan está Activo', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/objetivos-estrategicos-ti/${objetivoTiEId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('38. Swagger documenta seguridad bearer en GET de objetivos estratégicos TI', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    expect(
      document.paths['/api/v1/objetivos-estrategicos-ti']?.get?.security,
    ).toEqual([{ bearer: [] }]);
  });
});
