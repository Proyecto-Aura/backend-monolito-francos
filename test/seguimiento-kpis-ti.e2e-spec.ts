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
  identificador: 'e2e-ventas-seguimiento-ti-oft0-469',
  password: 'VentasSeguimientoTiE2e123',
};
const VENTAS_EMAIL = 'e2e-ventas-seguimiento-ti-oft0-469@francos.test';
const VENTAS_DOCUMENTO = '99999969';
const TEST_PREFIX = 'Seguimiento TI E2E OFT0-469';
const PLAN_PRINCIPAL_NAME = `${TEST_PREFIX} Plan principal`;
const PLAN_SECUNDARIO_NAME = `${TEST_PREFIX} Plan secundario`;
const ANIO_INICIO = 2075;
const ANIO_FIN = 2076;

interface CumplimientoHttp {
  porcentaje_promedio: number | null;
  kpis_evaluados: number;
  total_kpis: number;
  kpis_verde: number;
  kpis_amarillo: number;
  kpis_rojo: number;
  kpis_sin_dato: number;
}

interface PuntoSerieHttp {
  anio: number;
  periodo: { id: number; codigo: string; nombre: string; numero: number };
  valor: number | null;
  meta: number | null;
  semaforo_color: string | null;
}

interface KpiSeguimientoHttp {
  id: number;
  codigo: string;
  nombre: string;
  operador: string;
  ultimo_valor: {
    anio: number;
    periodo: { id: number; codigo: string; nombre: string };
    valor: number;
    semaforo_color: string;
  } | null;
  avance_pct: number | null;
  serie: PuntoSerieHttp[];
}

interface SeguimientoKpisHttp {
  plan: { id: number; codigo: string; nombre: string };
  cumplimiento_general: CumplimientoHttp;
  perspectivas: {
    id: number;
    nombre: string;
    cumplimiento: CumplimientoHttp;
    objetivos: {
      id: number;
      codigo: string;
      nombre: string;
      responsable: string;
      oe_negocio_id: number | null;
      oe_negocio: { id: number; codigo: string; nombre: string } | null;
      kpis: KpiSeguimientoHttp[];
    }[];
  }[];
}

describe('Seguimiento de KPIs TI (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let ventasToken: string;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[] = [];
  let existingActivePlanIds: number[] = [];
  let perspectivaUnoId: number;
  let perspectivaDosId: number;
  let perspectivasActivasIds: number[] = [];
  let frecuenciaTrimestralId: number;
  let frecuenciaAnualId: number;
  let periodoT2Id: number;
  let unidadMedidaId: number;
  let planPrincipalId: number;
  let planPrincipalCodigo: string;
  let planSecundarioId: number;
  let objetivoNegAId: number;
  let objetivoNegA: { id: number; codigo: string; nombre: string };
  let objetivoNegOtroPlanId: number;
  let objetivoAId: number;
  let objetivoBId: number;
  let objetivoOtroPlanId: number;
  let kpiAId: number;
  let kpiBId: number;
  let kpiNegId: number;
  let kpiOtroPlanId: number;
  let seguimientoActivo: SeguimientoKpisHttp;

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
        apellido_materno: 'Seguimiento E2E',
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
    const iniciativaIds = (
      await prisma.iniciativa.findMany({
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
        prisma.iniciativa.deleteMany({ where: { id: { in: iniciativaIds } } }),
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
        prisma.planEstrategico.deleteMany({ where: { id: { in: planIds } } }),
      ]);
    }

    return { planIds, objetivoIds, kpiIds, iniciativaIds };
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

    return response.body as { id: number; codigo: string };
  };

  const createObjetivoNegocio = async (
    planId: number,
    perspectivaId: number,
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

    return response.body as { id: number; codigo: string; nombre: string };
  };

  const createObjetivoTi = async (
    planId: number,
    perspectivaId: number,
    oeNegocioId: number,
    nombre: string,
    responsable: string,
  ) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/objetivos-estrategicos-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan_estrategico_id: planId,
        perspectiva_bsc_id: perspectivaId,
        oe_negocio_id: oeNegocioId,
        responsable,
        nombre,
      })
      .expect(201);

    return (response.body as { id: number }).id;
  };

  const getSeguimiento = async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/planes-estrategicos/${planPrincipalId}/seguimiento-kpis-ti`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    return response.body as SeguimientoKpisHttp;
  };

  const findKpi = (seguimiento: SeguimientoKpisHttp, kpiId: number) =>
    seguimiento.perspectivas
      .flatMap(({ objetivos }) => objetivos)
      .flatMap(({ kpis }) => kpis)
      .find(({ id }) => id === kpiId);

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

    const [
      perspectivasUsadas,
      perspectivasActivas,
      frecuenciaTrimestral,
      frecuenciaAnual,
      unidadMedida,
    ] = await Promise.all([
      prisma.perspectivaBsc.findMany({
        where: { estado: true },
        orderBy: { orden: 'asc' },
        take: 2,
      }),
      prisma.perspectivaBsc.findMany({
        where: { estado: true },
        orderBy: { orden: 'asc' },
      }),
      prisma.frecuenciaMedicion.findFirstOrThrow({
        where: { nombre: 'Trimestral', estado: true },
      }),
      prisma.frecuenciaMedicion.findFirstOrThrow({
        where: { nombre: 'Anual', estado: true },
      }),
      prisma.unidadMedidaKpi.findFirstOrThrow({ where: { estado: true } }),
    ]);

    expect(perspectivasUsadas).toHaveLength(2);
    perspectivasActivasIds = perspectivasActivas.map(({ id }) => id);
    perspectivaUnoId = perspectivasUsadas[0].id;
    perspectivaDosId = perspectivasUsadas[1].id;
    frecuenciaTrimestralId = frecuenciaTrimestral.id;
    frecuenciaAnualId = frecuenciaAnual.id;
    unidadMedidaId = unidadMedida.id;

    const periodoT2 = await prisma.periodo.findFirstOrThrow({
      where: {
        frecuencia_id: frecuenciaTrimestralId,
        codigo: 'T2',
        estado: true,
      },
    });
    periodoT2Id = periodoT2.id;

    await createTestUser();
    adminToken = await login(ADMIN_CREDENTIALS);
    ventasToken = await login(VENTAS_CREDENTIALS);

    const planPrincipal = await createPlan(
      PLAN_PRINCIPAL_NAME,
      ANIO_INICIO,
      ANIO_FIN,
    );
    planPrincipalId = planPrincipal.id;
    planPrincipalCodigo = planPrincipal.codigo;
    planSecundarioId = (await createPlan(PLAN_SECUNDARIO_NAME, 2085, 2086)).id;

    objetivoNegA = await createObjetivoNegocio(
      planPrincipalId,
      perspectivaUnoId,
      `${TEST_PREFIX} Objetivo Negocio A`,
      'Responsable Negocio A',
    );
    objetivoNegAId = objetivoNegA.id;
    const objetivoNegOtroPlan = await createObjetivoNegocio(
      planSecundarioId,
      perspectivaUnoId,
      `${TEST_PREFIX} Objetivo Negocio otro plan`,
      'Responsable Negocio externo',
    );
    objetivoNegOtroPlanId = objetivoNegOtroPlan.id;
    objetivoAId = await createObjetivoTi(
      planPrincipalId,
      perspectivaUnoId,
      objetivoNegAId,
      `${TEST_PREFIX} Objetivo TI A`,
      'Responsable A',
    );
    objetivoBId = await createObjetivoTi(
      planPrincipalId,
      perspectivaDosId,
      objetivoNegAId,
      `${TEST_PREFIX} Objetivo TI B`,
      'Responsable B',
    );
    objetivoOtroPlanId = await createObjetivoTi(
      planSecundarioId,
      perspectivaUnoId,
      objetivoNegOtroPlanId,
      `${TEST_PREFIX} Objetivo TI otro plan`,
      'Responsable externo',
    );

    const kpiAResponse = await request(app.getHttpServer())
      .post('/api/v1/kpis-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        objetivo_estrategico_id: objetivoAId,
        nombre: `${TEST_PREFIX} KPI A trimestral`,
        formula: 'Resultado / meta',
        frecuencia_id: frecuenciaTrimestralId,
        unidad_medida_id: unidadMedidaId,
        metas_por_anio: [
          {
            anio: 2075,
            meta: 10,
            operador_verde: '>=',
            operador_amarillo: '>=',
            valor_amarillo: 8,
          },
          {
            anio: 2076,
            meta: 10,
            operador_verde: '>=',
            operador_amarillo: '>=',
            valor_amarillo: 8,
          },
        ],
      })
      .expect(201);
    kpiAId = (kpiAResponse.body as { id: number }).id;

    const kpiBResponse = await request(app.getHttpServer())
      .post('/api/v1/kpis-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        objetivo_estrategico_id: objetivoBId,
        nombre: `${TEST_PREFIX} KPI B anual`,
        formula: 'Resultado anual',
        frecuencia_id: frecuenciaAnualId,
        unidad_medida_id: unidadMedidaId,
        metas_por_anio: [
          {
            anio: 2075,
            meta: 20,
            operador_verde: '>=',
            operador_amarillo: '>=',
            valor_amarillo: 16,
          },
          {
            anio: 2076,
            meta: 20,
            operador_verde: '>=',
            operador_amarillo: '>=',
            valor_amarillo: 16,
          },
        ],
      })
      .expect(201);
    kpiBId = (kpiBResponse.body as { id: number }).id;

    const kpiNegResponse = await request(app.getHttpServer())
      .post('/api/v1/kpis')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        objetivo_estrategico_id: objetivoNegAId,
        nombre: `${TEST_PREFIX} KPI de Negocio`,
        formula: 'Resultado de Negocio',
        frecuencia_id: frecuenciaAnualId,
        unidad_medida_id: unidadMedidaId,
        metas_por_anio: [
          {
            anio: 2075,
            meta: 100,
            operador_verde: '>=',
            operador_amarillo: '>=',
            valor_amarillo: 80,
          },
          {
            anio: 2076,
            meta: 100,
            operador_verde: '>=',
            operador_amarillo: '>=',
            valor_amarillo: 80,
          },
        ],
      })
      .expect(201);
    kpiNegId = (kpiNegResponse.body as { id: number }).id;

    const kpiOtroPlanResponse = await request(app.getHttpServer())
      .post('/api/v1/kpis-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        objetivo_estrategico_id: objetivoOtroPlanId,
        nombre: `${TEST_PREFIX} KPI TI de otro plan`,
        formula: 'Resultado externo',
        frecuencia_id: frecuenciaAnualId,
        unidad_medida_id: unidadMedidaId,
        metas_por_anio: [
          {
            anio: 2085,
            meta: 100,
            operador_verde: '>=',
            operador_amarillo: '>=',
            valor_amarillo: 80,
          },
          {
            anio: 2086,
            meta: 100,
            operador_verde: '>=',
            operador_amarillo: '>=',
            valor_amarillo: 80,
          },
        ],
      })
      .expect(201);
    kpiOtroPlanId = (kpiOtroPlanResponse.body as { id: number }).id;
  });

  afterAll(async () => {
    if (!prisma) {
      await app?.close();
      return;
    }

    try {
      const cleanupIds = await deleteTestPlans();

      if (existingActivePlanIds.length > 0) {
        await prisma.planEstrategico.updateMany({
          where: { id: { in: existingActivePlanIds } },
          data: { estado: true },
        });
      }

      await deleteTestUser();
      if (adminUserId) {
        await prisma.refreshToken.deleteMany({
          where: {
            user_id: adminUserId,
            id: { notIn: existingAdminRefreshTokenIds },
          },
        });
      }

      const [
        planes,
        objetivos,
        relaciones,
        kpis,
        metasAnuales,
        semaforos,
        valores,
        iniciativas,
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
        prisma.iniciativa.count({
          where: { id: { in: cleanupIds.iniciativaIds } },
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
        iniciativas,
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
        iniciativas: 0,
        usuarios: 0,
        personas: 0,
      });
    } finally {
      await app.close();
    }
  });

  it('1. GET /api/v1/planes-estrategicos/:id/seguimiento-kpis-ti sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/planes-estrategicos/${planPrincipalId}/seguimiento-kpis-ti`)
      .expect(401);
  });

  it('2. GET /api/v1/planes-estrategicos/:id/seguimiento-kpis-ti con rol ventas devuelve 403', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/planes-estrategicos/${planPrincipalId}/seguimiento-kpis-ti`)
      .set('Authorization', `Bearer ${ventasToken}`)
      .expect(403);
  });

  it('3. GET /api/v1/planes-estrategicos/:id/seguimiento-kpis-ti devuelve 404 para un plan inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/planes-estrategicos/2147483647/seguimiento-kpis-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('4. muestra la grilla completa en Borrador, aísla planes y tipos y conserva el vínculo compartido con Negocio', async () => {
    const seguimiento = await getSeguimiento();

    expect(seguimiento.plan).toEqual({
      id: planPrincipalId,
      codigo: planPrincipalCodigo,
      nombre: PLAN_PRINCIPAL_NAME,
    });
    expect(seguimiento.perspectivas.map(({ id }) => id)).toEqual(
      perspectivasActivasIds,
    );

    const perspectivaUno = seguimiento.perspectivas.find(
      ({ id }) => id === perspectivaUnoId,
    );
    const perspectivaDos = seguimiento.perspectivas.find(
      ({ id }) => id === perspectivaDosId,
    );
    expect(perspectivaUno?.objetivos.map(({ id }) => id)).toEqual([
      objetivoAId,
    ]);
    expect(perspectivaUno?.objetivos[0].kpis.map(({ id }) => id)).toEqual([
      kpiAId,
    ]);
    expect(perspectivaDos?.objetivos.map(({ id }) => id)).toEqual([
      objetivoBId,
    ]);
    expect(perspectivaDos?.objetivos[0].kpis.map(({ id }) => id)).toEqual([
      kpiBId,
    ]);

    for (const perspectiva of seguimiento.perspectivas.filter(
      ({ id }) => id !== perspectivaUnoId && id !== perspectivaDosId,
    )) {
      expect(perspectiva.objetivos).toEqual([]);
    }

    const objetivos = seguimiento.perspectivas.flatMap(
      ({ objetivos }) => objetivos,
    );
    expect(objetivos.map(({ id }) => id)).toEqual([objetivoAId, objetivoBId]);
    expect(objetivos.map(({ id }) => id)).not.toContain(objetivoOtroPlanId);
    expect(objetivos.map(({ id }) => id)).not.toContain(objetivoNegAId);
    expect(objetivos.map(({ id }) => id)).not.toContain(objetivoNegOtroPlanId);
    const kpiIds = objetivos.flatMap(({ kpis }) => kpis).map(({ id }) => id);
    expect(kpiIds).toEqual([kpiAId, kpiBId]);
    expect(kpiIds).not.toContain(kpiNegId);
    expect(kpiIds).not.toContain(kpiOtroPlanId);

    for (const objetivo of objetivos) {
      expect(objetivo.oe_negocio_id).toBe(objetivoNegAId);
      expect(objetivo.oe_negocio).toEqual({
        id: objetivoNegAId,
        codigo: objetivoNegA.codigo,
        nombre: objetivoNegA.nombre,
      });
    }
    expect(perspectivaDos?.objetivos[0].oe_negocio).toEqual(
      perspectivaUno?.objetivos[0].oe_negocio,
    );

    const kpiA = findKpi(seguimiento, kpiAId);
    const kpiB = findKpi(seguimiento, kpiBId);
    expect(kpiA?.serie).toHaveLength(8);
    expect(
      kpiA?.serie.map(({ anio, periodo }) => `${anio}-${periodo.codigo}`),
    ).toEqual([
      '2075-T1',
      '2075-T2',
      '2075-T3',
      '2075-T4',
      '2076-T1',
      '2076-T2',
      '2076-T3',
      '2076-T4',
    ]);
    expect(
      kpiA?.serie.every(
        ({ meta, valor, semaforo_color }) =>
          meta === 10 && valor === null && semaforo_color === null,
      ),
    ).toBe(true);
    expect(kpiB?.serie).toHaveLength(2);
    expect(kpiB?.serie.map(({ anio }) => anio)).toEqual([2075, 2076]);
    expect(
      kpiB?.serie.every(
        ({ meta, valor, semaforo_color }) =>
          meta === 20 && valor === null && semaforo_color === null,
      ),
    ).toBe(true);
    expect(kpiA?.ultimo_valor).toBeNull();
    expect(kpiA?.avance_pct).toBeNull();
    expect(kpiB?.ultimo_valor).toBeNull();
    expect(kpiB?.avance_pct).toBeNull();
    expect(perspectivaUno?.cumplimiento).toMatchObject({
      porcentaje_promedio: null,
      kpis_evaluados: 0,
      kpis_sin_dato: 1,
    });
    expect(perspectivaDos?.cumplimiento).toMatchObject({
      porcentaje_promedio: null,
      kpis_evaluados: 0,
      kpis_sin_dato: 1,
    });
    expect(seguimiento.cumplimiento_general).toMatchObject({
      porcentaje_promedio: null,
      total_kpis: 2,
      kpis_sin_dato: 2,
    });
  });

  it('5. activa el plan principal con metas y semáforos completos', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}/activar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      (response.body as { estado_plan: { codigo: string } }).estado_plan.codigo,
    ).toBe('ACTIVO');
  });

  it('6. registra un valor Amarillo y calcula 80 por ciento de avance', async () => {
    const registro = await request(app.getHttpServer())
      .post(`/api/v1/kpis/${kpiAId}/valores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ anio: 2076, periodo_id: periodoT2Id, valor: 8 });

    expect([200, 201]).toContain(registro.status);
    expect(
      (registro.body as { semaforo: { color: string } }).semaforo.color,
    ).toBe('AMARILLO');

    seguimientoActivo = await getSeguimiento();
    const kpiA = findKpi(seguimientoActivo, kpiAId);
    const punto = kpiA?.serie.find(
      ({ anio, periodo }) => anio === 2076 && periodo.id === periodoT2Id,
    );
    expect(punto).toEqual({
      anio: 2076,
      periodo: {
        id: periodoT2Id,
        codigo: 'T2',
        nombre: 'Trimestre 2',
        numero: 2,
      },
      valor: 8,
      meta: 10,
      semaforo_color: 'AMARILLO',
    });
    expect(kpiA?.ultimo_valor).toEqual({
      anio: 2076,
      periodo: {
        id: periodoT2Id,
        codigo: 'T2',
        nombre: 'Trimestre 2',
      },
      valor: 8,
      semaforo_color: 'AMARILLO',
    });
    expect(kpiA?.avance_pct).toBe(80);
    expect(kpiA?.operador).toBe('>=');

    const perspectivaUno = seguimientoActivo.perspectivas.find(
      ({ id }) => id === perspectivaUnoId,
    );
    const perspectivaDos = seguimientoActivo.perspectivas.find(
      ({ id }) => id === perspectivaDosId,
    );
    expect(perspectivaUno?.cumplimiento).toMatchObject({
      porcentaje_promedio: 80,
      kpis_evaluados: 1,
      kpis_amarillo: 1,
      kpis_sin_dato: 0,
    });
    expect(perspectivaDos?.cumplimiento).toMatchObject({
      porcentaje_promedio: null,
      kpis_evaluados: 0,
      kpis_sin_dato: 1,
    });
    expect(seguimientoActivo.cumplimiento_general).toMatchObject({
      porcentaje_promedio: 80,
      kpis_evaluados: 1,
      total_kpis: 2,
      kpis_amarillo: 1,
      kpis_sin_dato: 1,
    });

    const kpiB = findKpi(seguimientoActivo, kpiBId);
    expect(kpiB?.ultimo_valor).toBeNull();
    expect(kpiB?.avance_pct).toBeNull();
    expect(
      kpiB?.serie.every(
        ({ valor, semaforo_color }) =>
          valor === null && semaforo_color === null,
      ),
    ).toBe(true);
    for (const objetivo of seguimientoActivo.perspectivas.flatMap(
      ({ objetivos }) => objetivos,
    )) {
      expect(objetivo.oe_negocio_id).toBe(objetivoNegAId);
      expect(objetivo.oe_negocio).toEqual({
        id: objetivoNegAId,
        codigo: objetivoNegA.codigo,
        nombre: objetivoNegA.nombre,
      });
    }
  });

  it('7. mantiene la misma lectura después de cerrar el plan', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}/cerrar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      (response.body as { estado_plan: { codigo: string } }).estado_plan.codigo,
    ).toBe('CERRADO');
    await expect(getSeguimiento()).resolves.toEqual(seguimientoActivo);
  });

  it('8. Swagger documenta seguridad bearer en GET de seguimiento de KPIs TI', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    expect(
      document.paths['/api/v1/planes-estrategicos/{id}/seguimiento-kpis-ti']
        ?.get?.security,
    ).toEqual([{ bearer: [] }]);
  });
});
