import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { EmailService } from '../src/modules/auth/domain/services/email.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { hashToken } from '../src/modules/auth/application/utils/token.util';

const DOCUMENTO = '99999941';
const EMAIL = 'e2e-verificacion@francos.test';
const USUARIO = 'e2e-verificacion';
const CONTRASENA = 'v'.repeat(12);
const DOCUMENTO_STAFF = '99999942';
const DOCUMENTO_VENTAS = '99999943';
const EMAIL_STAFF = 'e2e-verificacion-staff@francos.test';
const EMAIL_VENTAS = 'e2e-verificacion-ventas@francos.test';

describe('Verificación de correo (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userId: string;
  let adminUserId: string;
  let refreshTokensAdminIniciales: string[];
  const enviados: { verificationToken: string }[] = [];
  const bienvenidas: {
    username: string;
    contrasenaDefault: string;
    verificationToken: string;
  }[] = [];
  const emailService = {
    sendVerificationEmail: jest.fn((params: { verificationToken: string }) => {
      enviados.push(params);
      return Promise.resolve();
    }),
    sendDefaultCredentialsEmail: jest.fn(() => Promise.resolve()),
    sendClienteBienvenidaEmail: jest.fn(
      (params: {
        username: string;
        contrasenaDefault: string;
        verificationToken: string;
      }) => {
        bienvenidas.push(params);
        return Promise.resolve();
      },
    ),
    sendPasswordResetEmail: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailService)
      .useValue(emailService)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    const admin = await prisma.user.findUniqueOrThrow({
      where: { username: 'admin' },
      select: { id: true },
    });
    adminUserId = admin.id;
    const refreshTokensAdmin = await prisma.refreshToken.findMany({
      where: { user_id: adminUserId },
      select: { id: true },
    });
    refreshTokensAdminIniciales = refreshTokensAdmin.map(({ id }) => id);
    const role = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'cliente' },
    });
    await prisma.persona.deleteMany({
      where: {
        numero_documento: {
          in: [DOCUMENTO, DOCUMENTO_STAFF, DOCUMENTO_VENTAS],
        },
      },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'E2E',
        apellido_paterno: 'Correo',
        apellido_materno: 'Prueba',
        tipo_documento: 'dni',
        numero_documento: DOCUMENTO,
      },
    });
    const token = 'token-verificacion-e2e';
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: EMAIL,
        username: USUARIO,
        contrasena: await hashPassword(CONTRASENA),
        estado: true,
        email_verificado: false,
        token_verificacion_email: hashToken(token),
        token_verificacion_email_expiracion: new Date(
          Date.now() + 60 * 60 * 1000,
        ),
      },
    });
    userId = user.id;
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: role.id, estado: true },
    });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: {
        user_id: adminUserId,
        id: { notIn: refreshTokensAdminIniciales },
      },
    });
    const users = await prisma.user.findMany({
      where: {
        persona: {
          numero_documento: {
            in: [DOCUMENTO, DOCUMENTO_STAFF, DOCUMENTO_VENTAS],
          },
        },
      },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);
    await prisma.refreshToken.deleteMany({ where: { user_id: { in: ids } } });
    await prisma.usuarioRol.deleteMany({ where: { user_id: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.cliente.deleteMany({
      where: {
        persona: {
          numero_documento: {
            in: [DOCUMENTO, DOCUMENTO_STAFF, DOCUMENTO_VENTAS],
          },
        },
      },
    });
    await prisma.persona.deleteMany({
      where: {
        numero_documento: {
          in: [DOCUMENTO, DOCUMENTO_STAFF, DOCUMENTO_VENTAS],
        },
      },
    });
    await app.close();
  });

  it('bloquea el login sin verificar, verifica y luego permite iniciar sesión', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador: EMAIL, password: CONTRASENA })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador: EMAIL, password: 'x'.repeat(12) })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: 'token-verificacion-e2e' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador: EMAIL, password: CONTRASENA })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: 'token-verificacion-e2e' })
      .expect(400);
    await expect(
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          email_verificado: true,
          token_verificacion_email: true,
          token_verificacion_email_expiracion: true,
        },
      }),
    ).resolves.toEqual({
      email_verificado: true,
      token_verificacion_email: null,
      token_verificacion_email_expiracion: null,
    });
  });

  it('reenvía sin enumerar y respeta el cooldown', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        email_verificado: false,
        token_verificacion_email: null,
        token_verificacion_email_expiracion: null,
      },
    });
    await request(app.getHttpServer())
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'inexistente@francos.test' })
      .expect(200);
    expect(enviados).toHaveLength(0);
    await request(app.getHttpServer())
      .post('/api/v1/auth/resend-verification')
      .send({ email: EMAIL })
      .expect(200);
    expect(enviados).toHaveLength(1);
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { token_verificacion_email: true },
    });
    expect(stored.token_verificacion_email).toBe(
      hashToken(enviados[0].verificationToken),
    );
    await request(app.getHttpServer())
      .post('/api/v1/auth/resend-verification')
      .send({ email: EMAIL })
      .expect(200);
    expect(enviados).toHaveLength(1);
  });

  it('rechaza tokens expirados e inexistentes', async () => {
    const expirado = 'token-expirado-e2e';
    await prisma.user.update({
      where: { id: userId },
      data: {
        token_verificacion_email: hashToken(expirado),
        token_verificacion_email_expiracion: new Date(Date.now() - 1),
        email_verificado: false,
      },
    });
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: expirado })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: 'token-inexistente-e2e' })
      .expect(400);
  });

  it('invalida el enlace anterior tras reenviar y no envía para cuenta verificada', async () => {
    const anterior = 'token-anterior-e2e';
    await prisma.user.update({
      where: { id: userId },
      data: {
        token_verificacion_email: hashToken(anterior),
        token_verificacion_email_expiracion: null,
        email_verificado: false,
      },
    });
    enviados.length = 0;
    await request(app.getHttpServer())
      .post('/api/v1/auth/resend-verification')
      .send({ email: EMAIL })
      .expect(200);
    const nuevo = enviados[0].verificationToken;
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: anterior })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: nuevo })
      .expect(200);
    enviados.length = 0;
    await request(app.getHttpServer())
      .post('/api/v1/auth/resend-verification')
      .send({ email: EMAIL })
      .expect(200);
    expect(enviados).toHaveLength(0);
  });

  it('permite el login de ventas sin correo verificado', async () => {
    const role = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ventas' },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Ventas',
        apellido_paterno: 'E2E',
        apellido_materno: 'Prueba',
        tipo_documento: 'dni',
        numero_documento: DOCUMENTO_VENTAS,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: EMAIL_VENTAS,
        username: 'e2e-ventas-verificacion',
        contrasena: await hashPassword(CONTRASENA),
        estado: true,
        email_verificado: false,
      },
    });
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: role.id, estado: true },
    });
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador: EMAIL_VENTAS, password: CONTRASENA })
      .expect(201);
  });

  it('registra cliente por staff, envía una bienvenida y exige verificar antes del login', async () => {
    const admin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador: 'admin', password: 'admin123' })
      .expect(201);
    bienvenidas.length = 0;
    emailService.sendClienteBienvenidaEmail.mockClear();
    emailService.sendVerificationEmail.mockClear();
    emailService.sendDefaultCredentialsEmail.mockClear();
    await request(app.getHttpServer())
      .post('/api/v1/auth/register/cliente')
      .set(
        'Authorization',
        `Bearer ${(admin.body as { access_token: string }).access_token}`,
      )
      .send({
        nombres: 'Cliente',
        apellido_paterno: 'Staff',
        apellido_materno: 'E2E',
        tipo_documento: 'dni',
        numero_documento: DOCUMENTO_STAFF,
        tipo_cliente: 'persona_natural',
        categoria_cliente: 'minorista',
        email: EMAIL_STAFF,
      })
      .expect(201);
    expect(bienvenidas).toHaveLength(1);
    expect(emailService.sendClienteBienvenidaEmail).toHaveBeenCalledTimes(1);
    expect(bienvenidas[0]).toMatchObject({
      username: DOCUMENTO_STAFF,
      contrasenaDefault: DOCUMENTO_STAFF,
    });
    expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    expect(emailService.sendDefaultCredentialsEmail).not.toHaveBeenCalled();
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: EMAIL_STAFF },
      select: { token_verificacion_email: true, email_verificado: true },
    });
    expect(user.token_verificacion_email).toBe(
      hashToken(bienvenidas[0].verificationToken),
    );
    expect(user.token_verificacion_email).not.toBe(
      bienvenidas[0].verificationToken,
    );
    expect(user.email_verificado).toBe(false);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador: EMAIL_STAFF, password: DOCUMENTO_STAFF })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: bienvenidas[0].verificationToken })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador: EMAIL_STAFF, password: DOCUMENTO_STAFF })
      .expect(201)
      .expect((response) => {
        const body = response.body as { debe_cambiar_contrasena: boolean };
        expect(body.debe_cambiar_contrasena).toBe(true);
      });
  });
});
