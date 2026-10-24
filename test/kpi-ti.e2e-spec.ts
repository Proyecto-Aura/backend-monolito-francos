import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
  identificador: 'e2e-ventas-kpi-ti-oft0-457',
  password: 'VentasKpiTiE2e123',
};
const ESTRATEGICO_CREDENTIALS = {
  identificador: 'e2e-estrategico-kpi-ti-oft0-457',
  password: 'EstrategicoKpiTiE2e123',
};
const ESTRATEGICO_EMAIL = 'e2e-estrategico-kpi-ti-oft0-457@francos.test';
const ESTRATEGICO_DOCUMENTO = '99999986';
const VENTAS_EMAIL = 'e2e-ventas-kpi-ti-oft0-457@francos.test';
const VENTAS_DOCUMENTO = '99999987';
const PLAN_PREFIX = 'KPI-TI E2E OFT0-457';
const PLAN_PRINCIPAL_NAME = `${PLAN_PREFIX} Plan principal`;
const PLAN_SECUNDARIO_NAME = `${PLAN_PREFIX} Plan secundario`;
const ANIO_INICIO = 2040;
const ANIO_FIN_INICIAL = 2041;
const ANIO_FIN_EXTENDIDO = 2042;

interface KpiHttp {
  id: number;
  codigo: string;
  estado: boolean;
  nombre: string;
  formula: string;
  objetivo: { id: number; nombre: string };
  meta_final: number | null;
  metas_por_anio: {
    anio: number;
    meta: number;
    semaforo: {
      verde: object | null;
      amarillo: object | null;
      rojo: object | null;
    };
  }[];
}

interface KpiValorHttp {
  id: number;
  anio: number;
  periodo: { id: number; codigo: string; nombre: string };
  valor: number;
  semaforo: { color: string; color_hex: string };
}

describe('KPI TI (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let ventasToken: string;
  let estrategicoToken: string;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[] = [];
  let existingActivePlanIds: number[] = [];
  let perspectivaId: number;
  let frecuenciaAnualId: number;
  let periodoAnualId: number;
  let periodoOtraFrecuenciaId: number;
  let unidadMedidaId: number;
  let planPrincipalId: number;
  let planSecundarioId: number;
  let objetivoNegAId: number;
  let objetivoNegOtroPlanId: number;
  let objetivoAId: number;
  let objetivoBId: number;
  let objetivoOtroPlanId: number;
  let kpiNegId: number;
  let kpiPrincipalId: number;
  let kpiSecundarioId: number;
  let valorPrincipalId: number;
  let metasAntesDeSegundoPatch: KpiHttp['metas_por_anio'];

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
        apellido_materno: 'KPI TI E2E',
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

    const objetivoIds = (
      await prisma.objetivoEstrategico.findMany({
        where: { plan_estrategico_id: { in: planIds } },
        select: { id: true },
      })
    ).map(({ id }) => id);
    const kpiIds = (
      await prisma.kpi.findMany({
        where: { objetivo_estrategico_id: { in: objetivoIds } },
        select: { id: true },
      })
    ).map(({ id }) => id);

    await prisma.$transaction([
      prisma.kpiValor.deleteMany({ where: { kpi_id: { in: kpiIds } } }),
      prisma.semaforoConfig.deleteMany({ where: { kpi_id: { in: kpiIds } } }),
      prisma.kpiMetaAnual.deleteMany({ where: { kpi_id: { in: kpiIds } } }),
      prisma.kpi.deleteMany({ where: { id: { in: kpiIds } } }),
      // TI y NEG se borran juntos: Postgres valida la FK Restrict de
      // oe_negocio_id al final de la instrucción, no fila por fila.
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
    nombre: string,
    responsable: string,
  ) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan_estrategico_id: planId,
        perspectiva_bsc_id: perspectivaId,
        responsable,
        nombre,
      })
      .expect(201);

    return (response.body as { id: number }).id;
  };

  const createObjetivoTi = async (
    planId: number,
    oeNegocioId: number,
    nombre: string,
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

    return (response.body as { id: number }).id;
  };

  const metas = (incluirAnioExtendido = false) => [
    {
      anio: 2040,
      meta: 100,
      operador_verde: '>=',
      operador_amarillo: '>=',
      valor_amarillo: 80,
    },
    {
      anio: 2041,
      meta: 110,
      operador_verde: '>=',
      operador_amarillo: '>=',
      valor_amarillo: 90,
    },
    ...(incluirAnioExtendido
      ? [
          {
            anio: 2042,
            meta: 120,
            operador_verde: '>=',
            operador_amarillo: '>=',
            valor_amarillo: 100,
          },
        ]
      : []),
  ];

  const kpiBody = (metasPorAnio = metas()) => ({
    objetivo_estrategico_id: objetivoAId,
    nombre: `${PLAN_PREFIX} Margen operativo`,
    formula: 'Ingresos / costos',
    frecuencia_id: frecuenciaAnualId,
    unidad_medida_id: unidadMedidaId,
    metas_por_anio: metasPorAnio,
  });

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

    const [perspectiva, frecuenciaAnual, unidadMedida] = await Promise.all([
      prisma.perspectivaBsc.findFirstOrThrow({ where: { estado: true } }),
      prisma.frecuenciaMedicion.findFirstOrThrow({
        where: { nombre: 'Anual', estado: true },
      }),
      prisma.unidadMedidaKpi.findFirstOrThrow({ where: { estado: true } }),
    ]);
    perspectivaId = perspectiva.id;
    frecuenciaAnualId = frecuenciaAnual.id;
    unidadMedidaId = unidadMedida.id;

    const [periodoAnual, periodoOtraFrecuencia] = await Promise.all([
      prisma.periodo.findFirstOrThrow({
        where: { frecuencia_id: frecuenciaAnualId, estado: true },
        orderBy: { numero: 'asc' },
      }),
      prisma.periodo.findFirstOrThrow({
        where: { frecuencia_id: { not: frecuenciaAnualId }, estado: true },
        orderBy: { id: 'asc' },
      }),
    ]);
    periodoAnualId = periodoAnual.id;
    periodoOtraFrecuenciaId = periodoOtraFrecuencia.id;

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

    planPrincipalId = await createPlan(
      PLAN_PRINCIPAL_NAME,
      ANIO_INICIO,
      ANIO_FIN_INICIAL,
    );
    planSecundarioId = await createPlan(PLAN_SECUNDARIO_NAME, 2050, 2051);
    objetivoNegAId = await createObjetivoNegocio(
      planPrincipalId,
      `${PLAN_PREFIX} Objetivo Negocio A`,
      'Responsable Negocio A',
    );
    objetivoNegOtroPlanId = await createObjetivoNegocio(
      planSecundarioId,
      `${PLAN_PREFIX} Objetivo Negocio otro plan`,
      'Responsable Negocio externo',
    );
    objetivoAId = await createObjetivoTi(
      planPrincipalId,
      objetivoNegAId,
      `${PLAN_PREFIX} Objetivo TI A`,
    );
    objetivoBId = await createObjetivoTi(
      planPrincipalId,
      objetivoNegAId,
      `${PLAN_PREFIX} Objetivo TI B`,
    );
    objetivoOtroPlanId = await createObjetivoTi(
      planSecundarioId,
      objetivoNegOtroPlanId,
      `${PLAN_PREFIX} Objetivo TI otro plan`,
    );

    const kpiNegResponse = await request(app.getHttpServer())
      .post('/api/v1/kpis')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...kpiBody(),
        objetivo_estrategico_id: objetivoNegAId,
        nombre: `${PLAN_PREFIX} KPI Negocio`,
      })
      .expect(201);
    const kpiNeg = kpiNegResponse.body as KpiHttp;
    kpiNegId = kpiNeg.id;
    expect(kpiNeg.codigo).toMatch(/-KPI-N-001$/);
  });

  afterAll(async () => {
    if (!prisma) {
      await app?.close();
      return;
    }

    try {
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
      if (adminUserId) {
        await prisma.refreshToken.deleteMany({
          where: {
            user_id: adminUserId,
            id: { notIn: existingAdminRefreshTokenIds },
          },
        });
      }

      const [planes, usuarios, personas] = await Promise.all([
        prisma.planEstrategico.count({
          where: { nombre: { startsWith: PLAN_PREFIX } },
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

      expect({ planes, usuarios, personas }).toEqual({
        planes: 0,
        usuarios: 0,
        personas: 0,
      });
    } finally {
      await app.close();
    }
  });

  it('1. POST /api/v1/kpis-ti sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/kpis-ti')
      .send(kpiBody())
      .expect(401);
  });

  it('2. POST /api/v1/kpis-ti con rol ventas devuelve 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/kpis-ti')
      .set('Authorization', `Bearer ${ventasToken}`)
      .send(kpiBody())
      .expect(403);
  });

  it('3. rechaza crear un KPI TI con metas incompletas', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/kpis-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(kpiBody(metas().slice(0, 1)))
      .expect(409);
  });

  it('4. crea con rol estrategico un KPI TI con correlativo independiente y tres semáforos por año', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/kpis-ti')
      .set('Authorization', `Bearer ${estrategicoToken}`)
      .send(kpiBody())
      .expect(201);

    const creado = response.body as KpiHttp;
    kpiPrincipalId = creado.id;
    expect(creado.codigo).toMatch(/-KPI-TI-001$/);
    expect(creado.objetivo.id).toBe(objetivoAId);
    expect(creado.metas_por_anio).toHaveLength(2);
    for (const fila of creado.metas_por_anio) {
      expect(Object.values(fila.semaforo)).toHaveLength(3);
      expect(Object.values(fila.semaforo).every(Boolean)).toBe(true);
    }
  });

  it('5. lista el KPI TI del objetivo A', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/kpis-ti?objetivo_estrategico_id=${objetivoAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as { data: KpiHttp[] };
    expect(body.data.map(({ id }) => id)).toContain(kpiPrincipalId);
  });

  it('6. rechaza listar KPIs TI de un objetivo de Negocio', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/kpis-ti?objetivo_estrategico_id=${objetivoNegAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect((response.body as { message: string }).message).toBe(
      'Objetivo estratégico no encontrado',
    );
  });

  it('7. resume los KPIs TI del plan con objetivo y meta final', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/planes-estrategicos/${planPrincipalId}/kpis-ti`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const resumen = response.body as KpiHttp[];
    expect(resumen.map(({ id }) => id)).not.toContain(kpiNegId);
    const kpi = resumen.find(({ id }) => id === kpiPrincipalId);
    expect(kpi?.objetivo.id).toBe(objetivoAId);
    expect(kpi?.meta_final).toBe(110);
  });

  it('8. actualiza el nombre del KPI TI normalizando espacios', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/kpis-ti/${kpiPrincipalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: `  ${PLAN_PREFIX}   Margen actualizado  ` })
      .expect(200);

    const actualizado = response.body as KpiHttp;
    expect(actualizado.nombre).toBe(`${PLAN_PREFIX} Margen actualizado`);
    metasAntesDeSegundoPatch = actualizado.metas_por_anio;
  });

  it('9. preserva las metas del KPI TI si no se envían', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/kpis-ti/${kpiPrincipalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ formula: 'Utilidad / ventas' })
      .expect(200);

    const actualizado = response.body as KpiHttp;
    expect(actualizado.formula).toBe('Utilidad / ventas');
    expect(actualizado.metas_por_anio).toEqual(metasAntesDeSegundoPatch);
  });

  it('10. reasigna el KPI TI a otro objetivo TI del mismo plan', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/kpis-ti/${kpiPrincipalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ objetivo_estrategico_id: objetivoBId })
      .expect(200);

    expect((response.body as KpiHttp).objetivo.id).toBe(objetivoBId);
  });

  it('11. rechaza reasignar el KPI TI a un objetivo TI de otro plan', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/kpis-ti/${kpiPrincipalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ objetivo_estrategico_id: objetivoOtroPlanId })
      .expect(409);
  });

  it('12. rechaza reasignar el KPI TI a un objetivo de Negocio del mismo plan', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/kpis-ti/${kpiPrincipalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ objetivo_estrategico_id: objetivoNegAId })
      .expect(404);

    expect((response.body as { message: string }).message).toBe(
      'Objetivo estratégico no encontrado',
    );
  });

  it('13. rechaza editar mediante TI un KPI de Negocio', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/kpis-ti/${kpiNegId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: `${PLAN_PREFIX} edición cruzada` })
      .expect(404);

    expect((response.body as { message: string }).message).toBe(
      'KPI no encontrado',
    );
  });

  it('14. crea un segundo KPI TI con correlativo 002', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/kpis-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...kpiBody(),
        objetivo_estrategico_id: objetivoBId,
        nombre: `${PLAN_PREFIX} KPI secundario`,
      })
      .expect(201);

    const creado = response.body as KpiHttp;
    kpiSecundarioId = creado.id;
    expect(creado.codigo).toMatch(/-KPI-TI-002$/);
    expect(creado.objetivo.id).toBe(objetivoBId);
  });

  it('15. elimina lógicamente el segundo KPI TI sin valores', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/v1/kpis-ti/${kpiSecundarioId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((response.body as KpiHttp).estado).toBe(false);
    const listado = await request(app.getHttpServer())
      .get(`/api/v1/kpis-ti?objetivo_estrategico_id=${objetivoBId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      (listado.body as { data: KpiHttp[] }).data.map(({ id }) => id),
    ).not.toContain(kpiSecundarioId);
  });

  it('16. rechaza eliminar mediante TI un KPI de Negocio', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/v1/kpis-ti/${kpiNegId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect((response.body as { message: string }).message).toBe(
      'KPI no encontrado',
    );
  });

  it('17. extiende el plan principal a 2042', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ anio_fin: ANIO_FIN_EXTENDIDO })
      .expect(200);

    expect((response.body as { anio_fin: number }).anio_fin).toBe(
      ANIO_FIN_EXTENDIDO,
    );

    // El KPI NEG de aislamiento también debe cubrir el año nuevo.
    // Así el siguiente caso falla únicamente por el KPI TI incompleto.
    await request(app.getHttpServer())
      .patch(`/api/v1/kpis/${kpiNegId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ metas_por_anio: metas(true) })
      .expect(200);
  });

  it('18. rechaza activar el plan si al KPI TI le falta la meta y semáforo del año nuevo', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}/activar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('19. completa las metas y semáforos del KPI TI hasta 2042', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/kpis-ti/${kpiPrincipalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ metas_por_anio: metas(true) })
      .expect(200);

    const actualizado = response.body as KpiHttp;
    expect(actualizado.metas_por_anio).toHaveLength(3);
    expect(actualizado.meta_final).toBe(120);
    const filaNueva = actualizado.metas_por_anio.find(
      ({ anio }) => anio === 2042,
    );
    expect(
      Object.values(filaNueva?.semaforo ?? {}).filter(Boolean),
    ).toHaveLength(3);
    expect(
      actualizado.metas_por_anio.find(({ anio }) => anio === 2042),
    ).toBeDefined();
  });

  it('20. activa el plan completo y bloquea las ediciones del KPI TI', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}/activar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      (response.body as { estado_plan: { codigo: string } }).estado_plan.codigo,
    ).toBe('ACTIVO');

    await request(app.getHttpServer())
      .patch(`/api/v1/kpis-ti/${kpiPrincipalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: `${PLAN_PREFIX} edición bloqueada` })
      .expect(409);
  });

  // No se fuerza un plan con valores a Borrador: registrar exige Activo
  // y eliminar exige Borrador. El gate de valores se cubre en unitarios.
  it('21. rechaza eliminar el KPI TI mientras el plan está Activo', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/kpis-ti/${kpiPrincipalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('22. registra un valor del KPI TI con semáforo Amarillo', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/kpis-ti/${kpiPrincipalId}/valores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ anio: 2040, periodo_id: periodoAnualId, valor: 90 });

    expect([200, 201]).toContain(response.status);
    const valor = response.body as KpiValorHttp;
    valorPrincipalId = valor.id;
    expect(valor.valor).toBe(90);
    expect(valor.semaforo.color).toBe('AMARILLO');
  });

  it('23. rechaza un periodo de otra frecuencia al registrar un valor TI', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/kpis-ti/${kpiPrincipalId}/valores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        anio: 2040,
        periodo_id: periodoOtraFrecuenciaId,
        valor: 90,
      })
      .expect(409);
  });

  it('24. rechaza leer mediante TI el último valor de un KPI de Negocio', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/kpis-ti/${kpiNegId}/valores/ultimo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect((response.body as { message: string }).message).toBe(
      'KPI no encontrado',
    );
  });

  it('25. rechaza leer mediante TI el historial de un KPI de Negocio', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/kpis-ti/${kpiNegId}/valores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect((response.body as { message: string }).message).toBe(
      'KPI no encontrado',
    );
  });

  it('26. rechaza registrar mediante TI un valor de un KPI de Negocio', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/kpis-ti/${kpiNegId}/valores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ anio: 2040, periodo_id: periodoAnualId, valor: 90 })
      .expect(404);

    expect((response.body as { message: string }).message).toBe(
      'KPI no encontrado',
    );
  });

  it('27. corrige por upsert el valor TI a Verde sin crear otro registro', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/kpis-ti/${kpiPrincipalId}/valores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ anio: 2040, periodo_id: periodoAnualId, valor: 110 });

    expect([200, 201]).toContain(response.status);
    expect((response.body as KpiValorHttp).semaforo.color).toBe('VERDE');
    expect((response.body as KpiValorHttp).id).toBe(valorPrincipalId);

    const historialResponse = await request(app.getHttpServer())
      .get(`/api/v1/kpis-ti/${kpiPrincipalId}/valores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const historial = historialResponse.body as KpiValorHttp[];
    const registros = historial.filter(
      ({ anio, periodo }) => anio === 2040 && periodo.id === periodoAnualId,
    );
    expect(registros).toHaveLength(1);
    expect(registros[0].valor).toBe(110);
  });

  it('28. lee el historial y el último valor del KPI TI y comprueba que coinciden', async () => {
    const historialResponse = await request(app.getHttpServer())
      .get(`/api/v1/kpis-ti/${kpiPrincipalId}/valores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const historial = historialResponse.body as KpiValorHttp[];
    expect(historial).toHaveLength(1);

    const ultimoResponse = await request(app.getHttpServer())
      .get(`/api/v1/kpis-ti/${kpiPrincipalId}/valores/ultimo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const ultimo = ultimoResponse.body as KpiValorHttp;
    expect(ultimo).toEqual(historial[0]);
    expect(ultimo.id).toBe(valorPrincipalId);
    expect(ultimo.valor).toBe(110);
  });

  it('29. cierra el plan y bloquea nuevos valores del KPI TI', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}/cerrar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      (response.body as { estado_plan: { codigo: string } }).estado_plan.codigo,
    ).toBe('CERRADO');

    await request(app.getHttpServer())
      .post(`/api/v1/kpis-ti/${kpiPrincipalId}/valores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ anio: 2040, periodo_id: periodoAnualId, valor: 115 })
      .expect(409);
  });

  it('30. Swagger documenta seguridad bearer en GET de KPIs TI', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    expect(document.paths['/api/v1/kpis-ti']?.get?.security).toEqual([
      { bearer: [] },
    ]);
  });
});
