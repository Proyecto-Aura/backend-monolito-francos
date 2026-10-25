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
  identificador: 'e2e-ventas-iniciativa-ti-oft0-461',
  password: 'VentasIniciativaTiE2e123',
};
const ESTRATEGICO_CREDENTIALS = {
  identificador: 'e2e-estrategico-iniciativa-ti-oft0-461',
  password: 'EstrategicoIniciativaTiE2e123',
};
const ESTRATEGICO_EMAIL = 'e2e-estrategico-iniciativa-ti-oft0-461@francos.test';
const ESTRATEGICO_DOCUMENTO = '99999984';
const VENTAS_EMAIL = 'e2e-ventas-iniciativa-ti-oft0-461@francos.test';
const VENTAS_DOCUMENTO = '99999985';
const PLAN_PREFIX = 'INICIATIVA-TI E2E OFT0-461';
const PLAN_PRINCIPAL_NAME = `${PLAN_PREFIX} Plan principal`;
const PLAN_SECUNDARIO_NAME = `${PLAN_PREFIX} Plan secundario`;
const ANIO_INICIO = 2044;
const ANIO_FIN = 2045;

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

describe('Iniciativa TI (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let ventasToken: string;
  let estrategicoToken: string;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[] = [];
  let existingActivePlanIds: number[] = [];
  let perspectivaId: number;
  let planPrincipalId: number;
  let planSecundarioId: number;
  let objetivoNegAId: number;
  let objetivoNegOtroPlanId: number;
  let objetivoAId: number;
  let objetivoBId: number;
  let objetivoOtroPlanId: number;
  let iniciativaNegId: number;
  let iniciativaReasignarId: number;
  let iniciativaEliminarId: number;
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
        apellido_materno: 'Iniciativa TI E2E',
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
    await prisma.$transaction([
      prisma.iniciativa.deleteMany({
        where: { objetivo_estrategico_id: { in: objetivoIds } },
      }),
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

  const iniciativaBody = (objetivoId = objetivoAId) => ({
    objetivo_estrategico_id: objetivoId,
    nombre: `${PLAN_PREFIX} Reasignar`,
    descripcion: 'Iniciativa para pruebas E2E',
    responsable: 'Responsable E2E',
    fecha_inicio: '2044-01-15',
    fecha_fin: '2045-12-15',
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

    const perspectiva = await prisma.perspectivaBsc.findFirstOrThrow({
      where: { estado: true },
    });
    perspectivaId = perspectiva.id;

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
      ANIO_FIN,
    );
    planSecundarioId = await createPlan(PLAN_SECUNDARIO_NAME, 2056, 2057);
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

    const iniciativaNegResponse = await request(app.getHttpServer())
      .post('/api/v1/iniciativas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...iniciativaBody(objetivoNegAId),
        nombre: `${PLAN_PREFIX} Iniciativa Negocio`,
      })
      .expect(201);
    const iniciativaNeg = iniciativaNegResponse.body as IniciativaHttp;
    iniciativaNegId = iniciativaNeg.id;
    expect(iniciativaNeg.codigo).toMatch(/-INI-N-001$/);
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

  it('1. POST /api/v1/iniciativas-ti sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/iniciativas-ti')
      .send(iniciativaBody())
      .expect(401);
  });

  it('2. POST /api/v1/iniciativas-ti con rol ventas devuelve 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/iniciativas-ti')
      .set('Authorization', `Bearer ${ventasToken}`)
      .send(iniciativaBody())
      .expect(403);
  });

  it('3. rechaza crear con fecha de inicio posterior a la fecha de fin', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/iniciativas-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...iniciativaBody(),
        fecha_inicio: '2045-06-01',
        fecha_fin: '2045-05-31',
      })
      .expect(409);
  });

  it('4. rechaza crear con una fecha fuera de los años del plan', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/iniciativas-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...iniciativaBody(), fecha_inicio: '2043-12-31' })
      .expect(409);
  });

  it('5. crea con rol estrategico la iniciativa TI a reasignar con presupuesto', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/iniciativas-ti')
      .set('Authorization', `Bearer ${estrategicoToken}`)
      .send({ ...iniciativaBody(), presupuesto: 15000 })
      .expect(201);

    const creada = response.body as IniciativaHttp;
    iniciativaReasignarId = creada.id;
    expect(creada.codigo).toMatch(/-INI-TI-001$/);
    expect(creada.estado_iniciativa.codigo).toBe('PENDIENTE');
    expect(creada.presupuesto).toBe(15000);
  });

  it('6. rechaza un nombre duplicado en el mismo objetivo', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/iniciativas-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(iniciativaBody())
      .expect(409);
  });

  it('7. crea la iniciativa TI a eliminar sin presupuesto', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/iniciativas-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...iniciativaBody(objetivoBId),
        nombre: `${PLAN_PREFIX} Eliminar`,
      })
      .expect(201);

    const creada = response.body as IniciativaHttp;
    iniciativaEliminarId = creada.id;
    expect(creada.codigo).toMatch(/-INI-TI-002$/);
    expect(creada.presupuesto).toBeNull();
  });

  it('8. crea la iniciativa para el flujo completo', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/iniciativas-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...iniciativaBody(objetivoBId),
        nombre: `${PLAN_PREFIX} Flujo completo`,
      })
      .expect(201);

    const creada = response.body as IniciativaHttp;
    iniciativaFlujoCompletoId = creada.id;
    expect(creada.codigo).toMatch(/-INI-TI-003$/);
  });

  it('9. crea la iniciativa para cancelar', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/iniciativas-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...iniciativaBody(objetivoBId),
        nombre: `${PLAN_PREFIX} Cancelar`,
      })
      .expect(201);

    const creada = response.body as IniciativaHttp;
    iniciativaCancelarId = creada.id;
    expect(creada.codigo).toMatch(/-INI-TI-004$/);
  });

  it('10. lista las iniciativas activas del objetivo A', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/iniciativas-ti?objetivo_estrategico_id=${objetivoAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as { data: IniciativaHttp[] };
    expect(body.data.map(({ id }) => id)).toEqual(
      expect.arrayContaining([iniciativaReasignarId]),
    );
  });

  it('11. rechaza listar iniciativas TI de un objetivo de Negocio', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/iniciativas-ti?objetivo_estrategico_id=${objetivoNegAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect((response.body as { message: string }).message).toBe(
      'Objetivo estratégico no encontrado',
    );
  });

  it('12. obtiene las cuatro iniciativas en el resumen del plan', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/planes-estrategicos/${planPrincipalId}/iniciativas-ti`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const iniciativas = response.body as IniciativaHttp[];
    expect(iniciativas.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        iniciativaReasignarId,
        iniciativaEliminarId,
        iniciativaFlujoCompletoId,
        iniciativaCancelarId,
      ]),
    );
    expect(iniciativas).toHaveLength(4);
    expect(iniciativas.map(({ id }) => id)).not.toContain(iniciativaNegId);
    for (const iniciativa of iniciativas) {
      expect(iniciativa.objetivo.id).toBeDefined();
      expect(iniciativa.estado_iniciativa.codigo).toBe('PENDIENTE');
    }
  });

  it('13. edita nombre, descripción y presupuesto', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaReasignarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: `  ${PLAN_PREFIX}   Reasignada  `,
        descripcion: 'Descripción actualizada',
        presupuesto: 22000,
      })
      .expect(200);

    const actualizada = response.body as IniciativaHttp;
    expect(actualizada.nombre).toBe(`${PLAN_PREFIX} Reasignada`);
    expect(actualizada.descripcion).toBe('Descripción actualizada');
    expect(actualizada.presupuesto).toBe(22000);
  });

  it('14. reasigna la iniciativa a otro objetivo del mismo plan', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaReasignarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ objetivo_estrategico_id: objetivoBId })
      .expect(200);

    expect((response.body as IniciativaHttp).objetivo.id).toBe(objetivoBId);
  });

  it('15. rechaza reasignar la iniciativa a un objetivo de otro plan', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaReasignarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ objetivo_estrategico_id: objetivoOtroPlanId })
      .expect(409);
  });

  it('16. rechaza reasignar la iniciativa TI a un objetivo de Negocio del mismo plan', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaReasignarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ objetivo_estrategico_id: objetivoNegAId })
      .expect(404);

    expect((response.body as { message: string }).message).toBe(
      'Objetivo estratégico no encontrado',
    );
  });

  it('17. rechaza editar mediante TI una iniciativa de Negocio', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaNegId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: `${PLAN_PREFIX} Edición cruzada` })
      .expect(404);

    expect((response.body as { message: string }).message).toBe(
      'Iniciativa no encontrada',
    );
  });

  it('18. rechaza actualizar estado mientras el plan está en Borrador', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaFlujoCompletoId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'EN_PROCESO' })
      .expect(409);
  });

  it('19. elimina lógicamente la iniciativa Pendiente en Borrador', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/v1/iniciativas-ti/${iniciativaEliminarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((response.body as IniciativaHttp).estado).toBe(false);
  });

  it('20. rechaza eliminar mediante TI una iniciativa de Negocio', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/v1/iniciativas-ti/${iniciativaNegId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect((response.body as { message: string }).message).toBe(
      'Iniciativa no encontrada',
    );
  });

  it('21. activa el plan principal', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}/activar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      (response.body as { estado_plan: { codigo: string } }).estado_plan.codigo,
    ).toBe('ACTIVO');
  });

  it('22. rechaza crear una iniciativa después de activar el plan', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/iniciativas-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...iniciativaBody(objetivoBId),
        nombre: `${PLAN_PREFIX} Creación bloqueada`,
      })
      .expect(409);
  });

  it('23. rechaza editar una iniciativa después de activar el plan', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaReasignarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: `${PLAN_PREFIX} Edición bloqueada` })
      .expect(409);
  });

  it('24. rechaza eliminar una iniciativa después de activar el plan', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/iniciativas-ti/${iniciativaReasignarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('25. rechaza saltar de Pendiente a Completada', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaFlujoCompletoId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'COMPLETADA' })
      .expect(409);
  });

  it('26. permite avanzar de Pendiente a En Proceso', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaFlujoCompletoId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'EN_PROCESO' })
      .expect(200);

    expect((response.body as IniciativaHttp).estado_iniciativa.codigo).toBe(
      'EN_PROCESO',
    );
  });

  it('27. permite avanzar de En Proceso a Completada', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaFlujoCompletoId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'COMPLETADA' })
      .expect(200);

    expect((response.body as IniciativaHttp).estado_iniciativa.codigo).toBe(
      'COMPLETADA',
    );
  });

  it('28. rechaza cancelar una iniciativa Completada', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaFlujoCompletoId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        estado_codigo: 'CANCELADA',
        motivo_cancelacion: 'Cancelación no permitida',
      })
      .expect(409);
  });

  it('29. exige motivo al cancelar una iniciativa', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaCancelarId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'CANCELADA' })
      .expect(400);
  });

  it('30. cancela una iniciativa guardando el motivo', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaCancelarId}/estado`)
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

  it('31. rechaza avanzar una iniciativa Cancelada', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaCancelarId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'EN_PROCESO' })
      .expect(409);
  });

  it('32. rechaza actualizar mediante TI el estado de una iniciativa de Negocio', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaNegId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'EN_PROCESO' })
      .expect(404);

    expect((response.body as { message: string }).message).toBe(
      'Iniciativa no encontrada',
    );
  });

  it('33. cierra el plan principal', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planPrincipalId}/cerrar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      (response.body as { estado_plan: { codigo: string } }).estado_plan.codigo,
    ).toBe('CERRADO');
  });

  it('34. rechaza actualizar estado después de cerrar el plan', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/iniciativas-ti/${iniciativaReasignarId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_codigo: 'EN_PROCESO' })
      .expect(409);
  });

  it('35. Swagger documenta seguridad bearer en GET de iniciativas', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    expect(document.paths['/api/v1/iniciativas-ti']?.get?.security).toEqual([
      { bearer: [] },
    ]);
  });
});
