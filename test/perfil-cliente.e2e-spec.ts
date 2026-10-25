import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';

// Usuarios que crea este archivo (HU-B-015); se borran antes y después.
const PREFIJO = 'e2e-perfil-';
const PASSWORD = 'ClienteE2e123';
const CLIENTE = { username: `${PREFIJO}cliente`, documento: '99999971' };
const OTRO = { username: `${PREFIJO}otro`, documento: '99999972' };
const VENDEDOR = { username: `${PREFIJO}ventas`, documento: '99999973' };
const DOCUMENTOS = [CLIENTE.documento, OTRO.documento, VENDEDOR.documento];

describe('Editar datos personales del cliente (e2e, HU-B-015)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const token = async (username: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador: username, password: PASSWORD })
      .expect(201);
    return (response.body as { access_token: string }).access_token;
  };

  const perfil = (jwt: string) =>
    request(app.getHttpServer())
      .get('/api/v1/perfil')
      .set('Authorization', `Bearer ${jwt}`);

  const editar = (jwt: string, body: object) =>
    request(app.getHttpServer())
      .patch('/api/v1/perfil')
      .set('Authorization', `Bearer ${jwt}`)
      .send(body);

  const mensajes = (body: unknown) =>
    [(body as { message: string | string[] }).message].flat();

  const crearUsuario = async (
    datos: { username: string; documento: string },
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
        email: `${datos.username}@francos.test`,
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
  };

  const deleteTestData = async () => {
    const users = await prisma.user.findMany({
      where: { username: { startsWith: PREFIJO } },
      select: { id: true },
    });
    const userIds = users.map(({ id }) => id);

    await prisma.refreshToken.deleteMany({
      where: { user_id: { in: userIds } },
    });
    await prisma.usuarioRol.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.cliente.deleteMany({
      where: { persona: { numero_documento: { in: DOCUMENTOS } } },
    });
    await prisma.persona.deleteMany({
      where: { numero_documento: { in: DOCUMENTOS } },
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
    await deleteTestData();
    await crearUsuario(CLIENTE, 'cliente');
    await crearUsuario(OTRO, 'cliente');
    await crearUsuario(VENDEDOR, 'ventas');
  });

  afterAll(async () => {
    await deleteTestData();
    await app.close();
  });

  it('shows the profile of the logged-in client', async () => {
    const response = await perfil(await token(CLIENTE.username)).expect(200);

    expect(response.body).toEqual({
      nombres: 'Rosa Elena',
      apellido_paterno: 'Quispe',
      apellido_materno: 'Huamán',
      email: `${CLIENTE.username}@francos.test`,
      telefono: '987654321',
      tipo_documento: 'dni',
      numero_documento: CLIENTE.documento,
      tipo_cliente: 'persona_natural',
      razon_social: null,
    });
  });

  it('edits name, email and phone (RF-B43)', async () => {
    const jwt = await token(CLIENTE.username);
    const nuevoEmail = `${PREFIJO}rosa.nueva@francos.test`;

    const response = await editar(jwt, {
      nombres: '  Rosa María ',
      email: nuevoEmail,
      telefono: '912345678',
    }).expect(200);

    expect(response.body).toMatchObject({
      nombres: 'Rosa María',
      email: nuevoEmail,
      telefono: '912345678',
      apellido_paterno: 'Quispe',
    });
    // Con el email nuevo ya puede iniciar sesión.
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador: nuevoEmail, password: PASSWORD })
      .expect(201);
  });

  it('rejects an email that another account uses (409)', async () => {
    const response = await editar(await token(CLIENTE.username), {
      email: `${OTRO.username}@francos.test`,
    }).expect(409);

    expect(mensajes(response.body)).toEqual([
      'Ese correo ya está registrado en otra cuenta',
    ]);
  });

  it.each([
    [{ nombres: '   ' }, 'Ingresa tus nombres'],
    [{ email: 'no-es-correo' }, 'Ingresa un correo electrónico válido'],
    [{ telefono: '98765' }, 'El teléfono debe tener 9 dígitos'],
    [{ username: 'otro' }, 'property username should not exist'],
  ])('validates %o (400)', async (body, mensaje) => {
    const response = await editar(await token(CLIENTE.username), body).expect(
      400,
    );

    expect(mensajes(response.body)).toContain(mensaje);
  });

  it('is only for clients: staff get 403 and no session gets 401', async () => {
    await perfil(await token(VENDEDOR.username)).expect(403);
    await request(app.getHttpServer()).get('/api/v1/perfil').expect(401);
  });
});
