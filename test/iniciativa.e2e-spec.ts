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
  identificador: 'e2e-ventas-iniciativa-oft0-433',
  password: 'VentasIniciativaE2e123',
};
const VENTAS_EMAIL = 'e2e-ventas-iniciativa-oft0-433@francos.test';
const VENTAS_DOCUMENTO = '99999993';
const TEST_PREFIX = 'Iniciativa E2E OFT0-433';
const PLAN_PRINCIPAL_NAME = `${TEST_PREFIX} Plan principal`;
const PLAN_SECUNDARIO_NAME = `${TEST_PREFIX} Plan secundario`;
const ANIO_INICIO = 2046;
const ANIO_FIN = 2047;

interface IniciativaHttp {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  presupuesto: number | null;
  motivo_cancelacion: string | null;
  estado: boolean;
  estado_iniciativa: { codigo: string; nombre: string };
  objetivo: { id: number; nombre: string };
}

describe('Iniciativa (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let ventasToken: string;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[] = [];
  let existingActivePlanIds: number[] = [];
  let perspectivaId: number;
  let planPrincipalId: number;
  let planPrincipalCodigo: string;
  let planSecundarioId: number;
  let objetivoAId: number;
  let objetivoBId: number;
  let objetivoOtroPlanId: number;
  let iniciativaReasignarId: number;
  let iniciativaDeleteBlockId: number;
  let iniciativaFlujoCompletoId: number;
  let iniciativaCancelarId: number;

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
        apellido_materno: 'Iniciativa E2E',
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
    const iniciativaIds = (
      await prisma.iniciativa.findMany({
        where: { objetivo_estrategico_id: { in: objetivoIds } },
        select: { id: true },
      })
    ).map(({ id }) => id);

    if (planIds.length > 0) {
      await prisma.$transaction([
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

    return { planIds, objetivoIds, iniciativaIds };
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

  const iniciativaBody = (objetivoId = objetivoAId) => ({
    objetivo_estrategico_id: objetivoId,
    nombre: `${TEST_PREFIX} Reasignar`,
    descripcion: 'Iniciativa para pruebas E2E',
    responsable: 'Responsable E2E',
    fecha_inicio: '2046-01-15',
    fecha_fin: '2047-12-15',
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

    const perspectiva = await prisma.perspectivaBsc.findFirstOrThrow({
      where: { estado: true },
    });
    perspectivaId = perspectiva.id;

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
    planSecundarioId = (
      await createPlan(PLAN_SECUNDARIO_NAME, 2052, 2053)
    ).id;
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

    const [planes, objetivos, iniciativas, relaciones, usuarios, personas] =
      await Promise.all([
        prisma.planEstrategico.count({
          where: { nombre: { startsWith: TEST_PREFIX } },
        }),
        prisma.objetivoEstrategico.count({
          where: { id: { in: cleanupIds.objetivoIds } },
        }),
        prisma.iniciativa.count({
          where: { id: { in: cleanupIds.iniciativaIds } },
        }),
        prisma.relacionOe.count({
          where: {
            OR: [
              { origen_id: { in: cleanupIds.objetivoIds } },
              { destino_id: { in: cleanupIds.objetivoIds } },
            ],
          },
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

  it('1. POST /api/v1/iniciativas sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/iniciativas')
      .send(iniciativaBody())
      .expect(401);
  });

  it('2. POST /api/v1/iniciativas con rol ventas devuelve 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/iniciativas')
      .set('Authorization', `Bearer ${ventasToken}`)
      .send(iniciativaBody())
      .expect(403);
  });

  it('3. rechaza crear con fecha de inicio posterior a la fecha de fin', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/iniciativas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...iniciativaBody(),
        fecha_inicio: '2047-06-01',
        fecha_fin: '2047-05-31',
      })
      .expect(409);
  });

  it('4. rechaza crear con una fecha fuera de los años del plan', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/iniciativas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...iniciativaBody(), fecha_inicio: '2045-12-31' })
      .expect(409);
  });

  it('5. crea la iniciativa a reasignar con presupuesto', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/iniciativas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...iniciativaBody(), presupuesto: 15000 })
      .expect(201);

    const creada = response.body as IniciativaHttp;
    iniciativaReasignarId = creada.id;
    expect(creada.codigo).toBe(`${planPrincipalCodigo}-INI-N-001`);
    expect(creada.estado_iniciativa.codigo).toBe('PENDIENTE');
    expect(creada.presupuesto).toBe(15000);
  });

  it('6. rechaza un nombre duplicado en el mismo objetivo', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/iniciativas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(iniciativaBody())
      .expect(409);
  });

  it('7. crea la iniciativa que bloqueará el borrado sin presupuesto', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/iniciativas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...iniciativaBody(),
        nombre: `${TEST_PREFIX} Bloqueo eliminación`,
      })
      .expect(201);

    const creada = response.body as IniciativaHttp;
    iniciativaDeleteBlockId = creada.id;
    expect(creada.codigo).toBe(`${planPrincipalCodigo}-INI-N-002`);
    expect(creada.presupuesto).toBeNull();
  });

  it('8. crea la iniciativa para el flujo completo', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/iniciativas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...iniciativaBody(objetivoBId),
        nombre: `${TEST_PREFIX} Flujo completo`,
      })
      .expect(201);

    iniciativaFlujoCompletoId = (response.body as IniciativaHttp).id;
  });

  it('9. crea la iniciativa para cancelar', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/iniciativas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...iniciativaBody(objetivoBId),
        nombre: `${TEST_PREFIX} Cancelar`,
      })
      .expect(201);

    iniciativaCancelarId = (response.body as IniciativaHttp).id;
  });

  it('10. lista las iniciativas activas del objetivo A', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/iniciativas?objetivo_estrategico_id=${objetivoAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as { data: IniciativaHttp[] };
    expect(body.data.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        iniciativaReasignarId,
        iniciativaDeleteBlockId,
      ]),
    );
  });

  it('11. obtiene las cuatro iniciativas en el resumen del plan', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/planes-estrategicos/${planPrincipalId}/iniciativas`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const iniciativas = response.body as IniciativaHttp[];
    expect(iniciativas.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        iniciativaReasignarId,
        iniciativaDeleteBlockId,
        iniciativaFlujoCompletoId,
        iniciativaCancelarId,
      ]),
    );
    for (const iniciativa of iniciativas) {
      expect(iniciativa.objetivo.id).toBeDefined();
      expect(iniciativa.estado_iniciativa.codigo).toBe('PENDIENTE');
    }
  });

  it('12. edita nombre, descripción y presupuesto', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaReasignarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: `  ${TEST_PREFIX}   Reasignada  `,
        descripcion: 'Descripción actualizada',
        presupuesto: 22000,
      })
      .expect(200);

    const actualizada = response.body as IniciativaHttp;
    expect(actualizada.nombre).toBe(`${TEST_PREFIX} Reasignada`);
    expect(actualizada.descripcion).toBe('Descripción actualizada');
    expect(actualizada.presupuesto).toBe(22000);
  });

  it('13. reasigna la iniciativa a otro objetivo del mismo plan', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaReasignarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ objetivo_estrategico_id: objetivoBId })
      .expect(200);

    expect((response.body as IniciativaHttp).objetivo.id).toBe(objetivoBId);
  });

  it('14. rechaza reasignar la iniciativa a un objetivo de otro plan', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaReasignarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ objetivo_estrategico_id: objetivoOtroPlanId })
      .expect(409);
  });

  it('15. rechaza actualizar estado mientras el plan está en Borrador', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaFlujoCompletoId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'EN_PROCESO' })
      .expect(409);
  });

  it('16. bloquea eliminar el objetivo A mientras tiene una iniciativa activa', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/v1/objetivos-estrategicos/${objetivoAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    expect((response.body as { message: string }).message).toContain(
      'iniciativas',
    );
  });

  it('17. elimina lógicamente la iniciativa Pendiente en Borrador', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/v1/iniciativas/${iniciativaDeleteBlockId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((response.body as IniciativaHttp).estado).toBe(false);
  });

  it('18. activa el plan principal', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}/activar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      (response.body as { estado_plan: { codigo: string } }).estado_plan.codigo,
    ).toBe('ACTIVO');
  });

  it('19. rechaza crear una iniciativa después de activar el plan', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/iniciativas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...iniciativaBody(objetivoBId),
        nombre: `${TEST_PREFIX} Creación bloqueada`,
      })
      .expect(409);
  });

  it('20. rechaza editar una iniciativa después de activar el plan', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaReasignarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: `${TEST_PREFIX} Edición bloqueada` })
      .expect(409);
  });

  it('21. rechaza eliminar una iniciativa después de activar el plan', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/iniciativas/${iniciativaReasignarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('22. rechaza saltar de Pendiente a Completada', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaFlujoCompletoId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'COMPLETADA' })
      .expect(409);
  });

  it('23. permite avanzar de Pendiente a En Proceso', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaFlujoCompletoId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'EN_PROCESO' })
      .expect(200);

    expect((response.body as IniciativaHttp).estado_iniciativa.codigo).toBe(
      'EN_PROCESO',
    );
  });

  it('24. permite avanzar de En Proceso a Completada', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaFlujoCompletoId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'COMPLETADA' })
      .expect(200);

    expect((response.body as IniciativaHttp).estado_iniciativa.codigo).toBe(
      'COMPLETADA',
    );
  });

  it('25. rechaza cancelar una iniciativa Completada', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaFlujoCompletoId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        estado_codigo: 'CANCELADA',
        motivo_cancelacion: 'Cancelación no permitida',
      })
      .expect(409);
  });

  it('26. exige motivo al cancelar una iniciativa', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaCancelarId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'CANCELADA' })
      .expect(400);
  });

  it('27. cancela una iniciativa guardando el motivo', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaCancelarId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        estado_codigo: 'CANCELADA',
        motivo_cancelacion: 'Se reasignó el presupuesto',
      })
      .expect(200);

    const cancelada = response.body as IniciativaHttp;
    expect(cancelada.estado_iniciativa.codigo).toBe('CANCELADA');
    expect(cancelada.motivo_cancelacion).toBe('Se reasignó el presupuesto');
  });

  it('28. rechaza avanzar una iniciativa Cancelada', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaCancelarId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'EN_PROCESO' })
      .expect(409);
  });

  it('29. cierra el plan principal', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}/cerrar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      (response.body as { estado_plan: { codigo: string } }).estado_plan.codigo,
    ).toBe('CERRADO');
  });

  it('30. rechaza actualizar estado después de cerrar el plan', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas/${iniciativaReasignarId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'EN_PROCESO' })
      .expect(409);
  });

  it('31. Swagger documenta seguridad bearer en GET de iniciativas', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    expect(document.paths['/api/v1/iniciativas']?.get?.security).toEqual([
      { bearer: [] },
    ]);
  });
});
