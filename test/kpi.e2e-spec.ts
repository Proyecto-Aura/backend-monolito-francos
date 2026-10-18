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
  identificador: 'e2e-ventas-kpi-oft0-429',
  password: 'VentasKpiE2e123',
};
const VENTAS_EMAIL = 'e2e-ventas-kpi-oft0-429@francos.test';
const VENTAS_DOCUMENTO = '99999994';
const TEST_PREFIX = 'KPI E2E OFT0-429';
const PLAN_PRINCIPAL_NAME = `${TEST_PREFIX} Plan principal`;
const PLAN_SECUNDARIO_NAME = `${TEST_PREFIX} Plan secundario`;
const ANIO_INICIO = 2040;
const ANIO_FIN_INICIAL = 2041;
const ANIO_FIN_EXTENDIDO = 2042;

interface KpiHttp {
  id: number;
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

describe('KPI (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let ventasToken: string;
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
  let objetivoAId: number;
  let objetivoBId: number;
  let objetivoOtroPlanId: number;
  let kpiId: number;
  let metasAntesDeSegundoPatch: KpiHttp['metas_por_anio'];

  const login = async (credentials: typeof ADMIN_CREDENTIALS) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(credentials);

    expect([200, 201]).toContain(response.status);
    expect(response.body).toHaveProperty('access_token');
    return (response.body as { access_token: string }).access_token;
  };

  const deleteTestUser = async () => {
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
      return;
    }

    await prisma.persona.deleteMany({
      where: { numero_documento: VENTAS_DOCUMENTO },
    });
  };

  const createTestUser = async () => {
    const rol = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ventas' },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Usuario',
        apellido_paterno: 'Ventas',
        apellido_materno: 'KPI E2E',
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
      data: { user_id: user.id, rol_id: rol.id, estado: true },
    });
  };

  const deleteTestPlans = async () => {
    const planIds = (
      await prisma.planEstrategico.findMany({
        where: { nombre: { startsWith: TEST_PREFIX } },
        select: { id: true },
      })
    ).map(({ id }) => id);
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

    if (planIds.length > 0) {
      await prisma.$transaction([
        prisma.kpiValor.deleteMany({ where: { kpi_id: { in: kpiIds } } }),
        prisma.semaforoConfig.deleteMany({
          where: { kpi_id: { in: kpiIds } },
        }),
        prisma.kpiMetaAnual.deleteMany({
          where: { kpi_id: { in: kpiIds } },
        }),
        prisma.kpi.deleteMany({ where: { id: { in: kpiIds } } }),
        prisma.relacionOe.deleteMany({
          where: {
            OR: [
              { origen_id: { in: objetivoIds } },
              { destino_id: { in: objetivoIds } },
            ],
          },
        }),
        prisma.objetivoEstrategico.deleteMany({
          where: { id: { in: objetivoIds } },
        }),
        prisma.planEstrategico.deleteMany({
          where: { id: { in: planIds } },
        }),
      ]);
    }

    return { planIds, objetivoIds, kpiIds };
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

  const createObjetivo = async (
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
    nombre: `${TEST_PREFIX} Margen operativo`,
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
    await deleteTestUser();

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

    await createTestUser();
    adminToken = await login(ADMIN_CREDENTIALS);
    ventasToken = await login(VENTAS_CREDENTIALS);

    planPrincipalId = await createPlan(
      PLAN_PRINCIPAL_NAME,
      ANIO_INICIO,
      ANIO_FIN_INICIAL,
    );
    planSecundarioId = await createPlan(PLAN_SECUNDARIO_NAME, 2050, 2051);
    objetivoAId = await createObjetivo(
      planPrincipalId,
      `${TEST_PREFIX} Objetivo A`,
      'Responsable A',
    );
    objetivoBId = await createObjetivo(
      planPrincipalId,
      `${TEST_PREFIX} Objetivo B`,
      'Responsable B',
    );
    objetivoOtroPlanId = await createObjetivo(
      planSecundarioId,
      `${TEST_PREFIX} Objetivo otro plan`,
      'Responsable externo',
    );
  });

  afterAll(async () => {
    const cleanupIds = await deleteTestPlans();

    if (existingActivePlanIds.length > 0) {
      await prisma.planEstrategico.updateMany({
        where: { id: { in: existingActivePlanIds } },
        data: { estado: true },
      });
    }

    await deleteTestUser();
    await prisma.refreshToken.deleteMany({
      where: {
        user_id: adminUserId,
        id: { notIn: existingAdminRefreshTokenIds },
      },
    });

    const [
      planes,
      objetivos,
      relaciones,
      kpis,
      metasAnuales,
      semaforos,
      valores,
      usuarios,
      personas,
    ] = await Promise.all([
      prisma.planEstrategico.count({
        where: { nombre: { startsWith: TEST_PREFIX } },
      }),
      prisma.objetivoEstrategico.count({
        where: { id: { in: cleanupIds.objetivoIds } },
      }),
      prisma.relacionOe.count({
        where: {
          OR: [
            { origen_id: { in: cleanupIds.objetivoIds } },
            { destino_id: { in: cleanupIds.objetivoIds } },
          ],
        },
      }),
      prisma.kpi.count({ where: { id: { in: cleanupIds.kpiIds } } }),
      prisma.kpiMetaAnual.count({
        where: { kpi_id: { in: cleanupIds.kpiIds } },
      }),
      prisma.semaforoConfig.count({
        where: { kpi_id: { in: cleanupIds.kpiIds } },
      }),
      prisma.kpiValor.count({
        where: { kpi_id: { in: cleanupIds.kpiIds } },
      }),
      prisma.user.count({
        where: { username: VENTAS_CREDENTIALS.identificador },
      }),
      prisma.persona.count({
        where: { numero_documento: VENTAS_DOCUMENTO },
      }),
    ]);

    expect({
      planes,
      objetivos,
      relaciones,
      kpis,
      metasAnuales,
      semaforos,
      valores,
      usuarios,
      personas,
    }).toEqual({
      planes: 0,
      objetivos: 0,
      relaciones: 0,
      kpis: 0,
      metasAnuales: 0,
      semaforos: 0,
      valores: 0,
      usuarios: 0,
      personas: 0,
    });
    await app.close();
  });

  it('POST /api/v1/kpis sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/kpis')
      .send(kpiBody())
      .expect(401);
  });

  it('POST /api/v1/kpis con rol ventas devuelve 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/kpis')
      .set('Authorization', `Bearer ${ventasToken}`)
      .send(kpiBody())
      .expect(403);
  });

  it('POST /api/v1/kpis devuelve 409 si faltan años del plan', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/kpis')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(kpiBody(metas().slice(0, 1)))
      .expect(409);
  });

  it('crea correctamente un KPI con metas y tres semáforos por año', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/kpis')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(kpiBody())
      .expect(201);

    const creado = response.body as KpiHttp;
    kpiId = creado.id;
    expect(creado.objetivo.id).toBe(objetivoAId);
    expect(creado.metas_por_anio).toHaveLength(2);
    for (const fila of creado.metas_por_anio) {
      expect(Object.values(fila.semaforo)).toHaveLength(3);
      expect(Object.values(fila.semaforo).every(Boolean)).toBe(true);
    }
  });

  it('GET /api/v1/kpis lista el KPI del objetivo A', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/kpis?objetivo_estrategico_id=${objetivoAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as { data: KpiHttp[] };
    expect(body.data.map(({ id }) => id)).toContain(kpiId);
  });

  it('GET /api/v1/planes-estrategicos/:id/kpis devuelve objetivo y meta final', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/planes-estrategicos/${planPrincipalId}/kpis`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const resumen = response.body as KpiHttp[];
    const kpi = resumen.find(({ id }) => id === kpiId);
    expect(kpi?.objetivo.id).toBe(objetivoAId);
    expect(kpi?.meta_final).toBe(110);
  });

  it('PATCH /api/v1/kpis/:id actualiza el nombre', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/kpis/${kpiId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: `  ${TEST_PREFIX}   Margen actualizado  ` })
      .expect(200);

    const actualizado = response.body as KpiHttp;
    expect(actualizado.nombre).toBe(`${TEST_PREFIX} Margen actualizado`);
    metasAntesDeSegundoPatch = actualizado.metas_por_anio;
  });

  it('PATCH /api/v1/kpis/:id sin metas_por_anio preserva las metas', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/kpis/${kpiId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ formula: 'Utilidad / ventas' })
      .expect(200);

    const actualizado = response.body as KpiHttp;
    expect(actualizado.formula).toBe('Utilidad / ventas');
    expect(actualizado.metas_por_anio).toEqual(metasAntesDeSegundoPatch);
  });

  it('reasigna el KPI a otro objetivo del mismo plan', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/kpis/${kpiId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ objetivo_estrategico_id: objetivoBId })
      .expect(200);

    expect((response.body as KpiHttp).objetivo.id).toBe(objetivoBId);
  });

  it('rechaza reasignar el KPI a un objetivo de otro plan', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/kpis/${kpiId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ objetivo_estrategico_id: objetivoOtroPlanId })
      .expect(409);
  });

  it('rechaza eliminar el objetivo B mientras tiene un KPI activo', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/objetivos-estrategicos/${objetivoBId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('extiende el rango de años del plan en Borrador', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ anio_fin: ANIO_FIN_EXTENDIDO })
      .expect(200);

    expect((response.body as { anio_fin: number }).anio_fin).toBe(
      ANIO_FIN_EXTENDIDO,
    );
  });

  it('rechaza activar el plan si falta la meta y semáforo del año nuevo', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}/activar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('PATCH /api/v1/kpis/:id crea la meta y semáforos del año nuevo', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/kpis/${kpiId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ metas_por_anio: metas(true) })
      .expect(200);

    const actualizado = response.body as KpiHttp;
    expect(actualizado.metas_por_anio).toHaveLength(3);
    expect(
      actualizado.metas_por_anio.find(({ anio }) => anio === 2042),
    ).toBeDefined();
  });

  it('activa el plan completo y bloquea nuevas ediciones del KPI', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}/activar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      (response.body as { estado_plan: { codigo: string } }).estado_plan.codigo,
    ).toBe('ACTIVO');

    await request(app.getHttpServer())
      .patch(`/api/v1/kpis/${kpiId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: `${TEST_PREFIX} edición bloqueada` })
      .expect(409);
  });

  it('registra un valor y calcula el semáforo real del KPI', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/kpis/${kpiId}/valores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ anio: 2040, periodo_id: periodoAnualId, valor: 90 });

    expect([200, 201]).toContain(response.status);
    const valor = response.body as KpiValorHttp;
    expect(valor.semaforo.color).toBe('AMARILLO');
  });

  it('rechaza registrar un valor con un periodo de otra frecuencia', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/kpis/${kpiId}/valores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        anio: 2040,
        periodo_id: periodoOtraFrecuenciaId,
        valor: 90,
      })
      .expect(409);
  });

  it('corrige por upsert el mismo periodo sin crear otro registro', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/kpis/${kpiId}/valores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ anio: 2040, periodo_id: periodoAnualId, valor: 110 });

    expect([200, 201]).toContain(response.status);
    expect((response.body as KpiValorHttp).semaforo.color).toBe('VERDE');

    const historialResponse = await request(app.getHttpServer())
      .get(`/api/v1/kpis/${kpiId}/valores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const historial = historialResponse.body as KpiValorHttp[];
    const registros = historial.filter(
      ({ anio, periodo }) => anio === 2040 && periodo.id === periodoAnualId,
    );
    expect(registros).toHaveLength(1);
    expect(registros[0].valor).toBe(110);
  });

  it('lee el historial y el último valor registrado', async () => {
    const historialResponse = await request(app.getHttpServer())
      .get(`/api/v1/kpis/${kpiId}/valores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const historial = historialResponse.body as KpiValorHttp[];
    expect(historial).toHaveLength(1);

    const ultimoResponse = await request(app.getHttpServer())
      .get(`/api/v1/kpis/${kpiId}/valores/ultimo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const ultimo = ultimoResponse.body as KpiValorHttp;
    expect(ultimo.id).toBe(historial[0].id);
    expect(ultimo.valor).toBe(110);
  });

  it('cierra el plan y bloquea nuevos valores del KPI', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}/cerrar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      (response.body as { estado_plan: { codigo: string } }).estado_plan.codigo,
    ).toBe('CERRADO');

    await request(app.getHttpServer())
      .post(`/api/v1/kpis/${kpiId}/valores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ anio: 2040, periodo_id: periodoAnualId, valor: 115 })
      .expect(409);
  });

  it('Swagger documenta seguridad bearer en GET de KPIs', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    expect(document.paths['/api/v1/kpis']?.get?.security).toEqual([
      { bearer: [] },
    ]);
  });
});
