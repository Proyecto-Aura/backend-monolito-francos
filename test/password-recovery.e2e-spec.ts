import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { hashToken } from '../src/modules/auth/application/utils/token.util';
import { EmailService } from '../src/modules/auth/domain/services/email.service';

const RECOVERY_USER = {
  email: 'e2e-password-recovery@francos.test',
  username: 'e2e-password-recovery',
  contrasena_anterior: 'ClaveAnterior123',
  nueva_contrasena: 'ClaveNueva123',
  numero_documento: '99999997',
};
const FORGOT_PASSWORD_MESSAGE =
  'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña';

interface PasswordResetEmail {
  to: string;
  nombre: string;
  resetToken: string;
  frontend: 'tienda' | 'portal';
}

describe('Password recovery (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userId: string;
  let resetToken: string;
  let refreshTokenCookie: string;
  const sentEmails: PasswordResetEmail[] = [];
  const emailService = {
    sendPasswordResetEmail: jest.fn(
      (params: PasswordResetEmail): Promise<void> => {
        sentEmails.push(params);
        return Promise.resolve();
      },
    ),
  };

  const deleteRecoveryUser = async () => {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: RECOVERY_USER.email },
          { username: RECOVERY_USER.username },
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
    } else {
      await prisma.persona.deleteMany({
        where: { numero_documento: RECOVERY_USER.numero_documento },
      });
    }
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    await deleteRecoveryUser();
    const role = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'cliente' },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Usuario',
        apellido_paterno: 'Recuperacion',
        apellido_materno: 'E2E',
        tipo_documento: 'dni',
        numero_documento: RECOVERY_USER.numero_documento,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: RECOVERY_USER.email,
        username: RECOVERY_USER.username,
        contrasena: await hashPassword(RECOVERY_USER.contrasena_anterior),
        estado: true,
        email_verificado: true,
        debe_cambiar_contrasena: true,
      },
    });
    userId = user.id;
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: role.id, estado: true },
    });
  }, 30_000);

  afterAll(async () => {
    await deleteRecoveryUser();
    await app.close();
  }, 30_000);

  it('POST /api/v1/auth/forgot-password con correo inexistente responde 200 sin enviar correo', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'inexistente@francos.test' })
      .expect(200)
      .expect({ message: FORGOT_PASSWORD_MESSAGE });

    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('POST /api/v1/auth/forgot-password guarda el hash y envía el token en claro', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: RECOVERY_USER.email })
      .expect(200)
      .expect({ message: FORGOT_PASSWORD_MESSAGE });

    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const email = sentEmails[0];
    resetToken = email.resetToken;
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { token_recuperacion: true },
    });
    expect(user.token_recuperacion).toBe(hashToken(resetToken));
    expect(user.token_recuperacion).not.toBe(resetToken);
    expect(email).toMatchObject({
      to: RECOVERY_USER.email,
      frontend: 'tienda',
    });
  });

  it('restablece la contraseña con el token, sin Authorization', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identificador: RECOVERY_USER.email,
        password: RECOVERY_USER.contrasena_anterior,
      })
      .expect(201);
    const cookies = loginResponse.headers['set-cookie'];
    expect(cookies).toBeDefined();
    refreshTokenCookie = (cookies as string[]).find((cookie) =>
      cookie.startsWith('refresh_token='),
    ) as string;

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({
        token: resetToken,
        nueva_contrasena: RECOVERY_USER.nueva_contrasena,
        confirmar_contrasena: RECOVERY_USER.nueva_contrasena,
      })
      .expect(200)
      .expect({ message: 'Contraseña restablecida correctamente' });

    await expect(
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          debe_cambiar_contrasena: true,
          token_recuperacion: true,
          token_expiracion: true,
        },
      }),
    ).resolves.toEqual({
      debe_cambiar_contrasena: false,
      token_recuperacion: null,
      token_expiracion: null,
    });
  });

  it('revoca los refresh tokens y permite solo la nueva contraseña', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshTokenCookie)
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identificador: RECOVERY_USER.email,
        password: RECOVERY_USER.nueva_contrasena,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identificador: RECOVERY_USER.email,
        password: RECOVERY_USER.contrasena_anterior,
      })
      .expect(401);
  });

  it('rechaza un token que ya fue usado', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({
        token: resetToken,
        nueva_contrasena: RECOVERY_USER.nueva_contrasena,
        confirmar_contrasena: RECOVERY_USER.nueva_contrasena,
      })
      .expect(400)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.objectContaining({
            message: 'El enlace de recuperación es inválido o ha expirado',
          }),
        );
      });
  });

  it('rechaza un token expirado', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: RECOVERY_USER.email })
      .expect(200);

    const expiredToken = sentEmails.at(-1)?.resetToken;
    await prisma.user.update({
      where: { id: userId },
      data: { token_expiracion: new Date(Date.now() - 1) },
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({
        token: expiredToken,
        nueva_contrasena: RECOVERY_USER.nueva_contrasena,
        confirmar_contrasena: RECOVERY_USER.nueva_contrasena,
      })
      .expect(400)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.objectContaining({
            message: 'El enlace de recuperación es inválido o ha expirado',
          }),
        );
      });
  });

  it('rechaza confirmaciones distintas y contraseñas cortas', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'token-invalido',
        nueva_contrasena: 'ClaveSegura123',
        confirmar_contrasena: 'OtraClave123',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'token-invalido',
        nueva_contrasena: 'corta',
        confirmar_contrasena: 'corta',
      })
      .expect(400);
  });
});
