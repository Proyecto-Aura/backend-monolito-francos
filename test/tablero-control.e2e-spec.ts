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
  identificador: 'e2e-ventas-tablero-oft0-437',
  password: 'VentasTableroE2e123',
};
const VENTAS_EMAIL = 'e2e-ventas-tablero-oft0-437@francos.test';
const VENTAS_DOCUMENTO = '99999992';
const TEST_PREFIX = 'Tablero E2E OFT0-437';
const PLAN_PRINCIPAL_NAME = `${TEST_PREFIX} Plan principal`;
const PLAN_SECUNDARIO_NAME = `${TEST_PREFIX} Plan secundario`;
const ANIO_INICIO = 2048;
const ANIO_FIN = 2050;

interface ValorPorAnioHttp {
  anio: number;
  meta: number | null;
  valor: number | null;
  periodo: { id: number; codigo: string; nombre: string } | null;
  semaforo_color: string | null;
}

interface ObjetivoTableroHttp {
  id: number;
  codigo: string;
  nombre: string;
  responsable: string;
  iniciativas: { id: number }[];
  kpis: {
    id: number;
    codigo: string;
    nombre: string;
    valores_por_anio: ValorPorAnioHttp[];
  }[];
}

interface TableroControlHttp {
  plan: {
    id: number;
    codigo: string;
    nombre: string;
    anio_inicio: number;
    anio_fin: number;
    estado_plan: { codigo: string; nombre: string };
  };
  perspectivas: {
    id: number;
    nombre: string;
    objetivos: ObjetivoTableroHttp[];
  }[];
}

describe('Tablero de control (e2e)', () => {
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
  let periodoT3Id: number;
  let unidadMedidaId: number;
  let planPrincipalId: number;
  let planSecundarioId: number;
  let objetivoAId: number;
  let objetivoBId: number;
  let objetivoOtroPlanId: number;
  let kpiId: number;
  let iniciativaId: number;

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
        apellido_materno: 'Tablero E2E',
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

    return (response.body as { id: number }).id;
  };

  const createObjetivo = async (
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

    return (response.body as { id: number }).id;
  };

  const getTablero = async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/planes-estrategicos/${planPrincipalId}/tablero-control`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    return response.body as TableroControlHttp;
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

    const [perspectivas, frecuenciaTrimestral, unidadMedida] =
      await Promise.all([
        prisma.perspectivaBsc.findMany({
          where: { estado: true },
          orderBy: { orden: 'asc' },
        }),
        prisma.frecuenciaMedicion.findFirstOrThrow({
          where: { nombre: 'Trimestral', estado: true },
        }),
        prisma.unidadMedidaKpi.findFirstOrThrow({ where: { estado: true } }),
      ]);

    expect(perspectivas.length).toBeGreaterThanOrEqual(2);
    perspectivasActivasIds = perspectivas.map(({ id }) => id);
    perspectivaUnoId = perspectivas[0].id;
    perspectivaDosId = perspectivas[1].id;
    frecuenciaTrimestralId = frecuenciaTrimestral.id;
    unidadMedidaId = unidadMedida.id;

    const periodoT3 = await prisma.periodo.findFirstOrThrow({
      where: {
        frecuencia_id: frecuenciaTrimestralId,
        codigo: 'T3',
        estado: true,
      },
    });
    periodoT3Id = periodoT3.id;

    await createTestUser();
    adminToken = await login(ADMIN_CREDENTIALS);
    ventasToken = await login(VENTAS_CREDENTIALS);

    planPrincipalId = await createPlan(
      PLAN_PRINCIPAL_NAME,
      ANIO_INICIO,
      ANIO_FIN,
    );
    planSecundarioId = await createPlan(PLAN_SECUNDARIO_NAME, 2060, 2061);
    objetivoAId = await createObjetivo(
      planPrincipalId,
      perspectivaUnoId,
      `${TEST_PREFIX} Objetivo A`,
      'Responsable A',
    );
    objetivoBId = await createObjetivo(
      planPrincipalId,
      perspectivaDosId,
      `${TEST_PREFIX} Objetivo B`,
      'Responsable B',
    );
    objetivoOtroPlanId = await createObjetivo(
      planSecundarioId,
      perspectivaUnoId,
      `${TEST_PREFIX} Objetivo otro plan`,
      'Responsable externo',
    );

    const kpiResponse = await request(app.getHttpServer())
      .post('/api/v1/kpis')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        objetivo_estrategico_id: objetivoAId,
        nombre: `${TEST_PREFIX} Cumplimiento trimestral`,
        formula: 'Resultado / meta x 100',
        frecuencia_id: frecuenciaTrimestralId,
        unidad_medida_id: unidadMedidaId,
        metas_por_anio: [
          {
            anio: 2048,
            meta: 100,
            operador_verde: '>=',
            operador_amarillo: '>=',
            valor_amarillo: 80,
          },
          {
            anio: 2049,
            meta: 110,
            operador_verde: '>=',
            operador_amarillo: '>=',
            valor_amarillo: 90,
          },
          {
            anio: 2050,
            meta: 120,
            operador_verde: '>=',
            operador_amarillo: '>=',
            valor_amarillo: 100,
          },
        ],
      })
      .expect(201);
    kpiId = (kpiResponse.body as { id: number }).id;

    const iniciativaResponse = await request(app.getHttpServer())
      .post('/api/v1/iniciativas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        objetivo_estrategico_id: objetivoBId,
        nombre: `${TEST_PREFIX} Iniciativa objetivo B`,
        descripcion: 'Iniciativa exclusiva del objetivo B',
        responsable: 'Responsable iniciativa B',
        fecha_inicio: '2048-01-15',
        fecha_fin: '2050-12-15',
      })
      .expect(201);
    iniciativaId = (iniciativaResponse.body as { id: number }).id;
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
    await app.close();
  });

  it('1. GET /api/v1/planes-estrategicos/:id/tablero-control sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/planes-estrategicos/${planPrincipalId}/tablero-control`)
      .expect(401);
  });

  it('2. GET /api/v1/planes-estrategicos/:id/tablero-control con rol ventas devuelve 403', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/planes-estrategicos/${planPrincipalId}/tablero-control`)
      .set('Authorization', `Bearer ${ventasToken}`)
      .expect(403);
  });

  it('3. GET /api/v1/planes-estrategicos/:id/tablero-control devuelve 404 para un plan inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/planes-estrategicos/2147483647/tablero-control')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('4. muestra la grilla completa del plan en Borrador y aísla otros planes', async () => {
    const tablero = await getTablero();

    expect(tablero.plan).toMatchObject({
      id: planPrincipalId,
      nombre: PLAN_PRINCIPAL_NAME,
      anio_inicio: ANIO_INICIO,
      anio_fin: ANIO_FIN,
      estado_plan: { codigo: 'BORRADOR' },
    });
    expect(tablero.perspectivas.map(({ id }) => id)).toEqual(
      perspectivasActivasIds,
    );

    const perspectivaUno = tablero.perspectivas.find(
      ({ id }) => id === perspectivaUnoId,
    );
    const perspectivaDos = tablero.perspectivas.find(
      ({ id }) => id === perspectivaDosId,
    );
    expect(perspectivaUno?.objetivos.map(({ id }) => id)).toEqual([
      objetivoAId,
    ]);
    expect(perspectivaUno?.objetivos[0].kpis).toHaveLength(1);
    expect(perspectivaUno?.objetivos[0].kpis[0].id).toBe(kpiId);
    expect(perspectivaUno?.objetivos[0].iniciativas).toEqual([]);
    expect(perspectivaDos?.objetivos.map(({ id }) => id)).toEqual([
      objetivoBId,
    ]);
    expect(perspectivaDos?.objetivos[0].iniciativas).toHaveLength(1);
    expect(perspectivaDos?.objetivos[0].iniciativas[0].id).toBe(iniciativaId);
    expect(perspectivaDos?.objetivos[0].kpis).toEqual([]);

    const perspectivasNoUsadas = tablero.perspectivas.filter(
      ({ id }) => id !== perspectivaUnoId && id !== perspectivaDosId,
    );
    for (const perspectiva of perspectivasNoUsadas) {
      expect(perspectiva.objetivos).toEqual([]);
    }

    const objetivos = tablero.perspectivas.flatMap(
      ({ objetivos }) => objetivos,
    );
    expect(objetivos.map(({ id }) => id)).not.toContain(objetivoOtroPlanId);

    expect(perspectivaUno?.objetivos[0].kpis[0].valores_por_anio).toEqual([
      {
        anio: 2048,
        meta: 100,
        valor: null,
        periodo: null,
        semaforo_color: null,
      },
      {
        anio: 2049,
        meta: 110,
        valor: null,
        periodo: null,
        semaforo_color: null,
      },
      {
        anio: 2050,
        meta: 120,
        valor: null,
        periodo: null,
        semaforo_color: null,
      },
    ]);
  });

  it('5. muestra el valor registrado para 2049 en el periodo T3', async () => {
    await prisma.kpiValor.create({
      data: {
        kpi_id: kpiId,
        anio: 2049,
        periodo_id: periodoT3Id,
        valor: 95,
        semaforo_color: 'AMARILLO',
      },
    });

    const tablero = await getTablero();
    const kpi = tablero.perspectivas
      .flatMap(({ objetivos }) => objetivos)
      .flatMap(({ kpis }) => kpis)
      .find(({ id }) => id === kpiId);

    expect(kpi?.valores_por_anio).toEqual([
      {
        anio: 2048,
        meta: 100,
        valor: null,
        periodo: null,
        semaforo_color: null,
      },
      {
        anio: 2049,
        meta: 110,
        valor: 95,
        periodo: {
          id: periodoT3Id,
          codigo: 'T3',
          nombre: 'Trimestre 3',
        },
        semaforo_color: 'AMARILLO',
      },
      {
        anio: 2050,
        meta: 120,
        valor: null,
        periodo: null,
        semaforo_color: null,
      },
    ]);
  });

  it('6. permite leer el tablero después de activar el plan', async () => {
    const activarResponse = await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}/activar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      (activarResponse.body as { estado_plan: { codigo: string } }).estado_plan
        .codigo,
    ).toBe('ACTIVO');

    const tablero = await getTablero();
    expect(tablero.plan.estado_plan.codigo).toBe('ACTIVO');
  });

  it('7. permite leer el tablero después de cerrar el plan', async () => {
    const cerrarResponse = await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}/cerrar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      (cerrarResponse.body as { estado_plan: { codigo: string } }).estado_plan
        .codigo,
    ).toBe('CERRADO');

    const tablero = await getTablero();
    expect(tablero.plan.estado_plan.codigo).toBe('CERRADO');
  });

  it('8. Swagger documenta seguridad bearer en GET del tablero de control', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    expect(
      document.paths['/api/v1/planes-estrategicos/{id}/tablero-control']?.get
        ?.security,
    ).toEqual([{ bearer: [] }]);
  });
});
