import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { S3Service } from '../src/infrastructure/storage/s3.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { FakeS3Service } from './fake-s3.service';
import request from 'supertest';
import { App } from 'supertest/types';

const ADMIN_CREDENTIALS = {
  identificador: 'admin',
  password: 'admin123',
};
const VENTAS_CREDENTIALS = {
  identificador: 'e2e-ventas-documento-estrategico-ti',
  password: 'VentasDocumentoTi123',
};
const ESTRATEGICO_CREDENTIALS = {
  identificador: 'e2e-estrategico-documento-estrategico-ti',
  password: 'EstrategicoDocumentoTi123',
};
const VENTAS_EMAIL = 'e2e-ventas-documento-estrategico-ti@francos.test';
const ESTRATEGICO_EMAIL =
  'e2e-estrategico-documento-estrategico-ti@francos.test';
const VENTAS_DOCUMENTO = '99999989';
const ESTRATEGICO_DOCUMENTO = '99999988';
const PLAN_PREFIX = 'DOC-TI E2E OFT0-445';
const PLAN_A_NAME = `${PLAN_PREFIX} Plan A Borrador`;
const PLAN_B_NAME = `${PLAN_PREFIX} Plan B`;

interface DocumentoHttp {
  id: number;
  estado: boolean;
  plan_estrategico_id: number;
  nombre: string;
  url?: string;
}

interface ErrorHttp {
  message: string;
}

describe('Documento estratégico TI (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let ventasToken: string;
  let estrategicoToken: string;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[] = [];
  let existingActivePlanIds: number[] = [];
  let tipoModuloTiId: number;
  let tipoModuloNegId: number;
  let planAId: number;
  let planBId: number;
  let documentoTiAId: number;
  let documentoNegAId: number;
  let documentoPlanBId: number;
  const fakeS3Service = new FakeS3Service();

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
        apellido_materno: 'Documento TI E2E',
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

  const collectAndDeleteTestData = async () => {
    const plans = await prisma.planEstrategico.findMany({
      where: { nombre: { startsWith: PLAN_PREFIX } },
      select: { id: true },
    });
    const planIds = plans.map(({ id }) => id);

    if (planIds.length > 0) {
      const documentos = await prisma.documentoEstrategico.findMany({
        where: { plan_estrategico_id: { in: planIds } },
        select: { ruta_archivo: true },
      });

      await Promise.all(
        documentos.map(({ ruta_archivo }) =>
          fakeS3Service.delete('docs', ruta_archivo),
        ),
      );
      await prisma.$transaction([
        prisma.documentoEstrategico.deleteMany({
          where: { plan_estrategico_id: { in: planIds } },
        }),
        prisma.planEstrategico.deleteMany({ where: { id: { in: planIds } } }),
      ]);
    }
  };

  const createPlan = async (nombre: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/planes-estrategicos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre, anio_inicio: 2035, anio_fin: 2038 })
      .expect(201);

    return (response.body as { id: number }).id;
  };

  const PDF_BUFFER = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
  const TEXT_BUFFER = Buffer.from('contenido de prueba');

  const uploadDocument = async (
    ruta: 'documentos-estrategicos' | 'documentos-estrategicos-ti',
    token: string,
    planId: number,
    nombre: string,
    filename = 'documento.pdf',
    contentType = 'application/pdf',
    buffer = PDF_BUFFER,
  ) => {
    return request(app.getHttpServer())
      .post(`/api/v1/${ruta}`)
      .set('Authorization', `Bearer ${token}`)
      .field('plan_estrategico_id', String(planId))
      .field('nombre', nombre)
      .attach('archivo', buffer, {
        filename,
        contentType,
      });
  };

  const uploadDocumentTi = async (
    token: string,
    planId: number,
    nombre: string,
    filename = 'documento-ti.pdf',
    contentType = 'application/pdf',
    buffer = PDF_BUFFER,
  ) =>
    uploadDocument(
      'documentos-estrategicos-ti',
      token,
      planId,
      nombre,
      filename,
      contentType,
      buffer,
    );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Service)
      .useValue(fakeS3Service)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    await collectAndDeleteTestData();
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

    const [tipoModuloTi, tipoModuloNeg] = await Promise.all([
      prisma.tipoModulo.findUniqueOrThrow({ where: { codigo: 'TI' } }),
      prisma.tipoModulo.findUniqueOrThrow({ where: { codigo: 'NEG' } }),
    ]);
    tipoModuloTiId = tipoModuloTi.id;
    tipoModuloNegId = tipoModuloNeg.id;

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
    if (!prisma) {
      return;
    }

    try {
      await collectAndDeleteTestData();

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

      const [planes, documentos, usuarios, personas] = await Promise.all([
        prisma.planEstrategico.count({
          where: { nombre: { startsWith: PLAN_PREFIX } },
        }),
        prisma.documentoEstrategico.count({
          where: {
            plan_estrategico: { nombre: { startsWith: PLAN_PREFIX } },
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

      expect({ planes, documentos, usuarios, personas }).toEqual({
        planes: 0,
        documentos: 0,
        usuarios: 0,
        personas: 0,
      });
    } finally {
      await app.close();
    }
  });

  it('1. POST válido con admin devuelve 201 y persiste el documento como TI', async () => {
    const response = await uploadDocumentTi(
      adminToken,
      planAId,
      `${PLAN_PREFIX} Documento A`,
    );

    expect(response.status).toBe(201);
    expect(response.body).not.toHaveProperty('url');
    const documento = response.body as DocumentoHttp;
    const persisted = await prisma.documentoEstrategico.findUnique({
      where: { id: documento.id },
    });
    expect(persisted?.tipo_modulo_id).toBe(tipoModuloTiId);
    expect(persisted?.tipo_modulo_id).not.toBe(tipoModuloNegId);
    expect(persisted?.ruta_archivo).toBeTruthy();
    expect(fakeS3Service.existe('docs', persisted!.ruta_archivo)).toBe(true);
    documentoTiAId = documento.id;
  });

  it('2. rechaza el duplicado TI pero permite el mismo nombre en Negocio', async () => {
    const nombre = `${PLAN_PREFIX} Documento A`;
    const duplicadoTi = await uploadDocumentTi(adminToken, planAId, nombre);
    expect(duplicadoTi.status).toBe(409);

    const documentoNeg = await uploadDocument(
      'documentos-estrategicos',
      adminToken,
      planAId,
      nombre,
    );
    expect(documentoNeg.status).toBe(201);
    documentoNegAId = (documentoNeg.body as DocumentoHttp).id;

    const persistedNeg = await prisma.documentoEstrategico.findUniqueOrThrow({
      where: { id: documentoNegAId },
    });
    expect(persistedNeg.tipo_modulo_id).toBe(tipoModuloNegId);
    expect(persistedNeg.tipo_modulo_id).not.toBe(tipoModuloTiId);
  });

  it('3. rechaza 409 al subir contra un plan Activo', async () => {
    const documentoPlanB = await uploadDocumentTi(
      adminToken,
      planBId,
      `${PLAN_PREFIX} Documento B existente`,
    );
    expect(documentoPlanB.status).toBe(201);
    documentoPlanBId = (documentoPlanB.body as DocumentoHttp).id;

    await request(app.getHttpServer())
      .patch(`/api/v1/planes-estrategicos/${planBId}/activar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const response = await uploadDocumentTi(
      adminToken,
      planBId,
      `${PLAN_PREFIX} Documento B bloqueado`,
    );
    expect(response.status).toBe(409);
  });

  it('4. rechaza 400 para un archivo de tipo no permitido', async () => {
    const response = await uploadDocumentTi(
      adminToken,
      planAId,
      `${PLAN_PREFIX} Texto inválido`,
      'notas.txt',
      'text/plain',
      TEXT_BUFFER,
    );

    expect(response.status).toBe(400);
  });

  it('5. rechaza 400 si falta el archivo', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/documentos-estrategicos-ti')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('plan_estrategico_id', String(planAId))
      .field('nombre', `${PLAN_PREFIX} Sin archivo`);

    expect(response.status).toBe(400);
  });

  it('6. rechaza 403 para el rol ventas', async () => {
    const response = await uploadDocumentTi(
      ventasToken,
      planAId,
      `${PLAN_PREFIX} Sin permisos`,
    );

    expect(response.status).toBe(403);
  });

  it('7. lista solo documentos TI activos con URLs presignadas', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/documentos-estrategicos-ti?plan_estrategico_id=${planAId}`)
      .set('Authorization', `Bearer ${estrategicoToken}`)
      .expect(200);

    const data = response.body as { data: DocumentoHttp[] };
    expect(data.data.length).toBeGreaterThan(0);
    expect(data.data.every((documento) => documento.url)).toBe(true);
    expect(
      data.data.every((documento) => /^https?:\/\//.test(documento.url!)),
    ).toBe(true);
    expect(data.data.map(({ id }) => id)).toContain(documentoTiAId);
    expect(data.data.map(({ id }) => id)).not.toContain(documentoNegAId);
  });

  it('8. obtiene un documento TI existente con URL presignada', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/documentos-estrategicos-ti/${documentoTiAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const documento = response.body as DocumentoHttp;
    expect(documento.id).toBe(documentoTiAId);
    expect(documento.url).toMatch(/^https?:\/\//);
  });

  it('9. devuelve 404 para un documento inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/documentos-estrategicos-ti/999999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('10. devuelve 404 para un documento existente de Negocio', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/documentos-estrategicos-ti/${documentoNegAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('11. devuelve 400 para /todos porque ParseIntPipe rechaza todos', async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/documentos-estrategicos-ti/todos?plan_estrategico_id=${planAId}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('12. elimina físicamente un documento TI y su objeto del storage', async () => {
    const persisted = await prisma.documentoEstrategico.findUniqueOrThrow({
      where: { id: documentoTiAId },
      select: { ruta_archivo: true },
    });

    await request(app.getHttpServer())
      .delete(`/api/v1/documentos-estrategicos-ti/${documentoTiAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await expect(
      prisma.documentoEstrategico.findUnique({
        where: { id: documentoTiAId },
      }),
    ).resolves.toBeNull();
    expect(fakeS3Service.existe('docs', persisted.ruta_archivo)).toBe(false);
  });

  it('13. rechaza 409 al eliminar un documento cuyo plan está Activo', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/v1/documentos-estrategicos-ti/${documentoPlanBId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    expect((response.body as ErrorHttp).message).toContain('Borrador');
  });

  it('14. devuelve 404 al eliminar un documento inexistente', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/documentos-estrategicos-ti/999999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('15. devuelve 401 en todas las rutas sin token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/documentos-estrategicos-ti')
      .field('plan_estrategico_id', String(planAId))
      .field('nombre', `${PLAN_PREFIX} Sin token`)
      .attach('archivo', PDF_BUFFER, {
        filename: 'documento-ti.pdf',
        contentType: 'application/pdf',
      })
      .expect(401);

    await request(app.getHttpServer())
      .get(`/api/v1/documentos-estrategicos-ti?plan_estrategico_id=${planAId}`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/v1/documentos-estrategicos-ti/${documentoPlanBId}`)
      .expect(401);
    await request(app.getHttpServer())
      .delete(`/api/v1/documentos-estrategicos-ti/${documentoPlanBId}`)
      .expect(401);
  });
});
