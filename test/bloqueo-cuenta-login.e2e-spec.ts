import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { envs } from '../src/config/envs';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { hashToken } from '../src/modules/auth/application/utils/token.util';

// Bloqueo temporal de cuenta tras varios logins fallidos (protección contra
// fuerza bruta repartida entre muchas IPs, que el WAF por IP no cubre).
const USUARIO = {
  username: 'e2e-bloqueo-login',
  email: 'e2e-bloqueo-login@francos.test',
  password: 'BloqueoE2e123',
  documento: '99999949',
};
const CLAVE_ERRONEA = 'otra-clave-123';
const MENSAJE_BLOQUEO = `Demasiados intentos fallidos. Intenta de nuevo en ${envs.loginBloqueoMinutos} minutos o restablece tu contraseña`;

describe('Bloqueo de cuenta por intentos fallidos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userId: string;

  const login = (password: string, identificador = USUARIO.username) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador, password });

  // Falla `veces` seguidas y comprueba que todas respondan 401.
  const fallar = async (veces: number) => {
    for (let i = 0; i < veces; i++) {
      await login(CLAVE_ERRONEA).expect(401);
    }
  };

  const estadoBloqueo = () =>
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { intentos_fallidos: true, bloqueado_hasta: true },
    });

  const deleteUsuario = async () => {
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: USUARIO.username }, { email: USUARIO.email }] },
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
      where: { numero_documento: USUARIO.documento },
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
    await deleteUsuario();

    const rolCliente = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'cliente' },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Bruno',
        apellido_paterno: 'Bloqueo',
        apellido_materno: 'Prueba',
        tipo_documento: 'dni',
        numero_documento: USUARIO.documento,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: USUARIO.email,
        username: USUARIO.username,
        contrasena: await hashPassword(USUARIO.password),
        email_verificado: true,
      },
    });
    userId = user.id;
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: rolCliente.id, estado: true },
    });
  }, 30_000);

  // Cada caso parte de una cuenta sin fallos ni bloqueo y con su contraseña.
  beforeEach(async () => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        intentos_fallidos: 0,
        bloqueado_hasta: null,
        contrasena: await hashPassword(USUARIO.password),
      },
    });
  });

  afterAll(async () => {
    await deleteUsuario();
    await app.close();
  }, 30_000);

  it(`tras ${envs.loginMaxIntentos} fallos seguidos bloquea la cuenta y responde 429`, async () => {
    await fallar(envs.loginMaxIntentos - 1);

    const response = await login(CLAVE_ERRONEA).expect(429);

    expect((response.body as { message: string }).message).toBe(
      MENSAJE_BLOQUEO,
    );
    expect(Number(response.headers['retry-after'])).toBe(
      envs.loginBloqueoMinutos * 60,
    );
    const { bloqueado_hasta } = await estadoBloqueo();
    expect(bloqueado_hasta?.getTime()).toBeGreaterThan(Date.now());
  });

  it('con la cuenta bloqueada rechaza la contraseña correcta y no abre sesión', async () => {
    await fallar(envs.loginMaxIntentos - 1);
    await login(CLAVE_ERRONEA).expect(429);

    const response = await login(USUARIO.password).expect(429);

    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.body).not.toHaveProperty('access_token');
  });

  it('con el bloqueo vencido vuelve a entrar y queda sin fallos', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { bloqueado_hasta: new Date(Date.now() - 1000) },
    });

    await login(USUARIO.password).expect(201);

    await expect(estadoBloqueo()).resolves.toEqual({
      intentos_fallidos: 0,
      bloqueado_hasta: null,
    });
  });

  it('un login correcto reinicia la cuenta de fallos', async () => {
    await fallar(envs.loginMaxIntentos - 1);
    await login(USUARIO.password).expect(201);

    // Si no se hubiera reiniciado, este fallo sería el que bloquea.
    await login(CLAVE_ERRONEA).expect(401);
    await expect(estadoBloqueo()).resolves.toMatchObject({
      intentos_fallidos: 1,
      bloqueado_hasta: null,
    });
  });

  it('restablecer la contraseña por correo levanta el bloqueo', async () => {
    await fallar(envs.loginMaxIntentos - 1);
    await login(CLAVE_ERRONEA).expect(429);

    const token = 'token-e2e-bloqueo-login';
    await prisma.user.update({
      where: { id: userId },
      data: {
        token_recuperacion: hashToken(token),
        token_expiracion: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const nueva = 'BloqueoNueva123';
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({
        token,
        nueva_contrasena: nueva,
        confirmar_contrasena: nueva,
      })
      .expect(200);

    await login(nueva).expect(201);
  });

  it('con un usuario que no existe siempre responde 401, nunca 429', async () => {
    for (let i = 0; i <= envs.loginMaxIntentos; i++) {
      await login(CLAVE_ERRONEA, 'no-existe-e2e-bloqueo').expect(401);
    }
  });
});
