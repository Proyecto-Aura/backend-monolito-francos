import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { SESION_CERRADA_MESSAGE } from '../src/modules/auth/presentation/strategies/jwt.strategy';

// Cliente del portal (HU-B-004): al cerrar sesión su token deja de servir.
const CLIENTE = {
  username: 'e2e-cliente-logout',
  email: 'e2e-cliente-logout@francos.test',
  password: 'ClienteE2e123',
  documento: '99999962',
};

describe('Cerrar sesión del cliente (e2e, HU-B-004)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Inicia sesión y devuelve el access_token y la cookie del refresh token.
  const iniciarSesion = async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador: CLIENTE.username, password: CLIENTE.password })
      .expect(201);
    const cookie = [response.headers['set-cookie'] ?? []]
      .flat()
      .find((c) => c.startsWith('refresh_token='))!
      .split(';')[0];
    return {
      token: (response.body as { access_token: string }).access_token,
      cookie,
    };
  };

  const me = (token: string) =>
    request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

  const logout = (cookie: string) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie);

  const deleteCliente = async () => {
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: CLIENTE.username }, { email: CLIENTE.email }] },
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
      where: { numero_documento: CLIENTE.documento },
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

    // Limpia restos de una corrida anterior que haya quedado a medias.
    await deleteCliente();

    const rolCliente = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'cliente' },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Rosa Elena',
        apellido_paterno: 'Quispe',
        apellido_materno: 'Huamán',
        tipo_documento: 'dni',
        numero_documento: CLIENTE.documento,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: CLIENTE.email,
        username: CLIENTE.username,
        contrasena: await hashPassword(CLIENTE.password),
        email_verificado: true,
      },
    });
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: rolCliente.id, estado: true },
    });
  });

  afterAll(async () => {
    await deleteCliente();
    await app.close();
  });

  it('después de cerrar sesión el token JWT ya no sirve (401)', async () => {
    const { token, cookie } = await iniciarSesion();
    await me(token).expect(200);

    const response = await logout(cookie).expect(201);
    expect(response.body).toEqual({ message: 'Sesión cerrada' });

    const rechazo = await me(token).expect(401);
    expect((rechazo.body as { message: string }).message).toBe(
      SESION_CERRADA_MESSAGE,
    );
  });

  it('borra la cookie del refresh token y ya no se puede renovar el token', async () => {
    const { cookie } = await iniciarSesion();

    const response = await logout(cookie).expect(201);
    const borrada = [response.headers['set-cookie'] ?? []]
      .flat()
      .find((c) => c.startsWith('refresh_token='));
    expect(borrada).toMatch(/^refresh_token=;/);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('cerrar sesión en un dispositivo no cierra las demás sesiones', async () => {
    const primera = await iniciarSesion();
    const segunda = await iniciarSesion();

    await logout(primera.cookie).expect(201);

    await me(primera.token).expect(401);
    await me(segunda.token).expect(200);
  });
});
