import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';

const URL = '/api/v1/auth/cambiar-contrasena';
const ACTUAL = 'Actual1234';
const NUEVA = 'Nueva1234';

const TEST_USERS = {
  cliente: {
    identificador: 'e2e-cliente-cambio',
    email: 'e2e-cliente-cambio@francos.test',
    documento: '99999981',
    rol: 'cliente',
  },
  ventas: {
    identificador: 'e2e-ventas-cambio',
    email: 'e2e-ventas-cambio@francos.test',
    documento: '99999982',
    rol: 'ventas',
  },
} as const;

describe('Cambiar contraseña (e2e, HU-B-017)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const login = (identificador: string, password: string) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador, password });

  const tokenDe = async (identificador: string, password: string) => {
    const response = await login(identificador, password);
    expect([200, 201]).toContain(response.status);
    return (response.body as { access_token: string }).access_token;
  };

  const cambiar = (body: Record<string, unknown>, token?: string) => {
    const req = request(app.getHttpServer()).post(URL);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req.send(body);
  };

  const body = (overrides: Record<string, unknown> = {}) => ({
    contrasena_actual: ACTUAL,
    nueva_contrasena: NUEVA,
    confirmar_contrasena: NUEVA,
    ...overrides,
  });

  const deleteTestData = async () => {
    for (const testUser of Object.values(TEST_USERS)) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ username: testUser.identificador }, { email: testUser.email }],
        },
        select: { id: true },
      });
      if (user) {
        await prisma.$transaction([
          prisma.refreshToken.deleteMany({ where: { user_id: user.id } }),
          prisma.usuarioRol.deleteMany({ where: { user_id: user.id } }),
          prisma.user.delete({ where: { id: user.id } }),
        ]);
      }
      await prisma.persona.deleteMany({
        where: { numero_documento: testUser.documento },
      });
    }
  };

  // Deja al usuario con la contraseña ACTUAL y sin sesiones antes de cada caso.
  const createTestUser = async (
    testUser: (typeof TEST_USERS)[keyof typeof TEST_USERS],
  ) => {
    const rol = await prisma.rol.findUniqueOrThrow({
      where: { nombre: testUser.rol },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Rosa Elena',
        apellido_paterno: testUser.rol,
        apellido_materno: 'Cambio E2E',
        tipo_documento: 'dni',
        numero_documento: testUser.documento,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: testUser.email,
        username: testUser.identificador,
        contrasena: await hashPassword(ACTUAL),
        estado: true,
        email_verificado: true,
      },
    });
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: rol.id, estado: true },
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
  }, 30_000);

  beforeEach(async () => {
    await deleteTestData();
    for (const testUser of Object.values(TEST_USERS)) {
      await createTestUser(testUser);
    }
  }, 30_000);

  afterAll(async () => {
    await deleteTestData();
    await app.close();
  }, 30_000);

  it('responde 401 sin token', async () => {
    const response = await cambiar(body());

    expect(response.status).toBe(401);
  });

  it('responde 403 a un rol que no es cliente', async () => {
    const token = await tokenDe(TEST_USERS.ventas.identificador, ACTUAL);

    const response = await cambiar(body(), token);

    expect(response.status).toBe(403);
  });

  it('cambia la contraseña: entra con la nueva y ya no con la anterior (RF-B45)', async () => {
    const token = await tokenDe(TEST_USERS.cliente.identificador, ACTUAL);

    const response = await cambiar(body(), token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Contraseña actualizada' });
    expect((await login(TEST_USERS.cliente.identificador, ACTUAL)).status).toBe(
      401,
    );
    expect([200, 201]).toContain(
      (await login(TEST_USERS.cliente.identificador, NUEVA)).status,
    );
  });

  it('mantiene la sesión desde la que se cambia y cierra las demás', async () => {
    const otraSesion = await tokenDe(TEST_USERS.cliente.identificador, ACTUAL);
    const estaSesion = await tokenDe(TEST_USERS.cliente.identificador, ACTUAL);

    expect((await cambiar(body(), estaSesion)).status).toBe(200);

    const me = (token: string) =>
      request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
    expect((await me(estaSesion)).status).toBe(200);
    expect((await me(otraSesion)).status).toBe(401);
  });

  it('rechaza con 400 una contraseña actual incorrecta y no cambia nada', async () => {
    const token = await tokenDe(TEST_USERS.cliente.identificador, ACTUAL);

    const response = await cambiar(
      body({ contrasena_actual: 'Otra12345' }),
      token,
    );

    expect(response.status).toBe(400);
    expect((response.body as { message: string }).message).toBe(
      'La contraseña actual no es correcta',
    );
    expect([200, 201]).toContain(
      (await login(TEST_USERS.cliente.identificador, ACTUAL)).status,
    );
  });

  it('rechaza con 400 una nueva contraseña igual a la actual', async () => {
    const token = await tokenDe(TEST_USERS.cliente.identificador, ACTUAL);

    const response = await cambiar(
      body({ nueva_contrasena: ACTUAL, confirmar_contrasena: ACTUAL }),
      token,
    );

    expect(response.status).toBe(400);
    expect((response.body as { message: string }).message).toBe(
      'La nueva contraseña debe ser distinta de la actual',
    );
  });

  it.each([
    [
      'una nueva contraseña corta',
      { nueva_contrasena: 'Corta1', confirmar_contrasena: 'Corta1' },
      'La nueva contraseña debe tener al menos 8 caracteres',
    ],
    [
      'una confirmación distinta',
      { confirmar_contrasena: 'Distinta1234' },
      'Las contraseñas no coinciden',
    ],
    [
      'la contraseña actual vacía',
      { contrasena_actual: '' },
      'Ingresa tu contraseña actual',
    ],
  ])('rechaza con 400 %s', async (_caso, cambios, mensaje) => {
    const token = await tokenDe(TEST_USERS.cliente.identificador, ACTUAL);

    const response = await cambiar(body(cambios), token);

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toContain(mensaje);
  });
});
