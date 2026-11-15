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

// Usuarios propios de este archivo (HU-B-016); se borran antes y después.
const PREFIJO = 'e2e-cambio-email-';
const PASSWORD = 'Clave1234';
const CLIENTE = {
  username: `${PREFIJO}cliente`,
  documento: '99999981',
  email: `${PREFIJO}cliente@francos.test`,
};
const OTRO = {
  username: `${PREFIJO}otro`,
  documento: '99999982',
  email: `${PREFIJO}otro@francos.test`,
};
const VENDEDOR = {
  username: `${PREFIJO}ventas`,
  documento: '99999983',
  email: `${PREFIJO}ventas@francos.test`,
};
const DOCUMENTOS = [CLIENTE.documento, OTRO.documento, VENDEDOR.documento];
const NUEVO_EMAIL = `${PREFIJO}nuevo@francos.test`;

interface CambioEmailParams {
  to: string;
  nombre: string;
  token: string;
  frontend: 'tienda' | 'portal';
}

describe('Cambio de email con verificación (e2e, HU-B-016)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let clienteId: string;
  const emails: CambioEmailParams[] = [];

  const emailService = {
    sendEmailChangeVerificationEmail: jest.fn(
      (params: CambioEmailParams): Promise<void> => {
        emails.push(params);
        return Promise.resolve();
      },
    ),
  };

  const login = (identificador: string) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador, password: PASSWORD });

  const token = async (identificador: string) => {
    const response = await login(identificador).expect(201);
    return (response.body as { access_token: string }).access_token;
  };

  const editar = (jwt: string, body: object) =>
    request(app.getHttpServer())
      .patch('/api/v1/perfil')
      .set('Authorization', `Bearer ${jwt}`)
      .send(body);

  const verificar = (tokenCambio: string) =>
    request(app.getHttpServer())
      .post('/api/v1/perfil/email/verificar')
      .send({ token: tokenCambio });

  const mensajes = (body: unknown) =>
    [(body as { message: string | string[] }).message].flat();

  const crearUsuario = async (
    datos: { username: string; documento: string; email: string },
    rol: string,
  ) => {
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Rosa Elena',
        apellido_paterno: 'Quispe',
        apellido_materno: 'Huamán',
        tipo_documento: 'dni',
        numero_documento: datos.documento,
        telefono: '987654321',
      },
    });
    if (rol === 'cliente') {
      await prisma.cliente.create({
        data: {
          persona_id: persona.id,
          tipo_cliente: 'persona_natural',
          categoria_cliente: 'minorista',
        },
      });
    }
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: datos.email,
        username: datos.username,
        contrasena: await hashPassword(PASSWORD),
        email_verificado: true,
      },
    });
    const { id: rol_id } = await prisma.rol.findUniqueOrThrow({
      where: { nombre: rol },
    });
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id, estado: true },
    });
    return user.id;
  };

  const deleteTestData = async () => {
    const users = await prisma.user.findMany({
      where: { username: { startsWith: PREFIJO } },
      select: { id: true, persona_id: true },
    });
    const userIds = users.map(({ id }) => id);
    const personaIds = users.map(({ persona_id }) => persona_id);

    await prisma.solicitudCambioEmail.deleteMany({
      where: { user_id: { in: userIds } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user_id: { in: userIds } },
    });
    await prisma.usuarioRol.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.cliente.deleteMany({
      where: { persona_id: { in: personaIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.persona.deleteMany({
      where: { numero_documento: { in: DOCUMENTOS } },
    });
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

    await deleteTestData();
    clienteId = await crearUsuario(CLIENTE, 'cliente');
    await crearUsuario(OTRO, 'cliente');
    await crearUsuario(VENDEDOR, 'ventas');
  }, 30_000);

  afterAll(async () => {
    await deleteTestData();
    await app.close();
  }, 30_000);

  it('PATCH /perfil sin token responde 401 y con staff 403', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/perfil')
      .send({ nombres: 'Rosa' })
      .expect(401);

    await editar(await token(VENDEDOR.username), {
      nombres: 'Rosa',
    }).expect(403);
  });

  it('PATCH /perfil sin email aplica nombre y teléfono y no deja nada pendiente', async () => {
    const response = await editar(await token(CLIENTE.username), {
      nombres: 'Rosa María',
      telefono: '912345678',
    }).expect(200);

    expect(response.body).toMatchObject({
      nombres: 'Rosa María',
      telefono: '912345678',
      email: CLIENTE.email,
      cambio_email_pendiente: false,
    });
    expect(emails).toHaveLength(0);
  });

  it('PATCH /perfil rechaza un email con formato inválido (400)', async () => {
    const response = await editar(await token(CLIENTE.username), {
      email: 'no-es-correo',
    }).expect(400);

    expect(mensajes(response.body)).toContain(
      'Ingresa un correo electrónico válido',
    );
  });

  it('PATCH /perfil rechaza el email de otra cuenta (409)', async () => {
    const response = await editar(await token(CLIENTE.username), {
      email: OTRO.email,
    }).expect(409);

    expect(mensajes(response.body)).toEqual([
      'Ese correo ya está registrado en otra cuenta',
    ]);
  });

  it('PATCH /perfil con email nuevo no lo aplica: guarda el hash y manda el enlace al nuevo', async () => {
    const response = await editar(await token(CLIENTE.username), {
      email: `  ${NUEVO_EMAIL.toUpperCase()} `,
    }).expect(200);

    expect(response.body).toMatchObject({
      email: CLIENTE.email,
      cambio_email_pendiente: true,
    });
    expect(JSON.stringify(response.body)).not.toContain(emails[0].token);

    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe(NUEVO_EMAIL);
    expect(emails[0].frontend).toBe('tienda');

    const solicitud = await prisma.solicitudCambioEmail.findUniqueOrThrow({
      where: { user_id: clienteId },
    });
    expect(solicitud.email_nuevo).toBe(NUEVO_EMAIL);
    expect(solicitud.token_hash).toBe(hashToken(emails[0].token));
    expect(solicitud.token_hash).not.toBe(emails[0].token);

    // Sin confirmar, el correo de la cuenta sigue siendo el viejo.
    await token(CLIENTE.email);
    await login(NUEVO_EMAIL).expect(401);
  });

  it('PATCH /perfil dentro del cooldown no reenvía el correo', async () => {
    const response = await editar(await token(CLIENTE.username), {
      email: NUEVO_EMAIL,
    }).expect(200);

    expect(response.body).toMatchObject({ cambio_email_pendiente: true });
    expect(emails).toHaveLength(1);
  });

  it('POST /perfil/email/verificar rechaza un token inexistente (400)', async () => {
    const response = await verificar('token-que-no-existe').expect(400);

    expect(mensajes(response.body)).toEqual([
      'El enlace no es válido o ya venció',
    ]);
  });

  it('POST /perfil/email/verificar exige el token (400)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/perfil/email/verificar')
      .send({})
      .expect(400);

    expect(mensajes(response.body)).toContain(
      'Ingresa el token de verificación',
    );
  });

  it('POST /perfil/email/verificar aplica el cambio, borra la solicitud y mantiene las sesiones', async () => {
    const sesionAbierta = await token(CLIENTE.username);

    await verificar(emails[0].token).expect(200, {
      message: 'Correo actualizado correctamente',
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: clienteId },
    });
    expect(user.email).toBe(NUEVO_EMAIL);
    expect(user.email_verificado).toBe(true);
    expect(
      await prisma.solicitudCambioEmail.count({
        where: { user_id: clienteId },
      }),
    ).toBe(0);
    expect(
      await prisma.refreshToken.count({
        where: { user_id: clienteId, revoked_at: null },
      }),
    ).toBeGreaterThan(0);

    // La sesión que ya estaba abierta sigue sirviendo y ve el correo nuevo.
    const perfil = await request(app.getHttpServer())
      .get('/api/v1/perfil')
      .set('Authorization', `Bearer ${sesionAbierta}`)
      .expect(200);
    expect(perfil.body).toMatchObject({ email: NUEVO_EMAIL });

    await token(NUEVO_EMAIL);
    await login(CLIENTE.email).expect(401);
  });

  it('POST /perfil/email/verificar rechaza un token ya usado (400)', async () => {
    const response = await verificar(emails[0].token).expect(400);

    expect(mensajes(response.body)).toEqual([
      'El enlace no es válido o ya venció',
    ]);
  });

  it('POST /perfil/email/verificar rechaza un token vencido (400)', async () => {
    const tokenVencido = 'token-vencido-e2e';
    await prisma.solicitudCambioEmail.create({
      data: {
        user_id: clienteId,
        email_nuevo: `${PREFIJO}vencido@francos.test`,
        token_hash: hashToken(tokenVencido),
        expira_at: new Date(Date.now() - 1000),
      },
    });

    const response = await verificar(tokenVencido).expect(400);

    expect(mensajes(response.body)).toEqual([
      'El enlace no es válido o ya venció',
    ]);
    expect(
      await prisma.solicitudCambioEmail.count({
        where: { user_id: clienteId },
      }),
    ).toBe(0);
  });

  it('POST /perfil/email/verificar responde 409 si otra cuenta tomó el correo', async () => {
    const tokenOcupado = 'token-ocupado-e2e';
    await prisma.solicitudCambioEmail.create({
      data: {
        user_id: clienteId,
        email_nuevo: OTRO.email,
        token_hash: hashToken(tokenOcupado),
        expira_at: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const response = await verificar(tokenOcupado).expect(409);

    expect(mensajes(response.body)).toEqual([
      'Ese correo ya está registrado en otra cuenta',
    ]);
    expect(
      await prisma.solicitudCambioEmail.count({
        where: { user_id: clienteId },
      }),
    ).toBe(0);
  });
});
