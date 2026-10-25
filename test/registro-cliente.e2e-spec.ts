import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

// Documentos que crea este archivo; se borran antes y después.
const DNI = '99999951';
const RUC_20 = '20999999951';
const DOCUMENTOS = [DNI, RUC_20];
const PREFIJO = 'e2e-registro-';

describe('Registrar cliente (e2e, HU-B-002)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const registrar = (body: object) =>
    request(app.getHttpServer()).post('/api/v1/auth/register').send(body);

  const persona = (overrides: Record<string, unknown> = {}) => ({
    nombres: 'Ana',
    apellido_paterno: 'Torres',
    apellido_materno: 'Vega',
    tipo_documento: 'dni',
    numero_documento: DNI,
    telefono: '987654321',
    fecha_nacimiento: '1998-05-12',
    direccion: 'Av. Los Girasoles 123',
    tipo_cliente: 'persona_natural',
    categoria_cliente: 'minorista',
    email: `${PREFIJO}ana@francos.test`,
    username: `${PREFIJO}ana`,
    password: 'Clave1234',
    ...overrides,
  });

  const mensajes = (body: unknown) =>
    [(body as { message: string | string[] }).message].flat();

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

    await deleteTestData();
  });

  afterAll(async () => {
    await deleteTestData();
    await app.close();
  });

  it('registra a una persona con DNI, con rol cliente y el correo sin verificar', async () => {
    const response = await registrar(persona()).expect(201);

    expect(response.body).toMatchObject({
      email: `${PREFIJO}ana@francos.test`,
      username: `${PREFIJO}ana`,
      email_verificado: false,
    });

    const user = await prisma.user.findFirstOrThrow({
      where: { username: `${PREFIJO}ana` },
      include: {
        usuario_roles: { include: { rol: true } },
        persona: { include: { cliente: true } },
      },
    });
    expect(user.token_verificacion_email).toMatch(/^[a-f0-9]{64}$/);
    expect(user.usuario_roles.map((ur) => ur.rol.nombre)).toEqual(['cliente']);
    expect(user.persona.cliente).toMatchObject({
      tipo_cliente: 'persona_natural',
    });
  });

  it('registra una empresa con RUC 20, su razón social y los datos del contacto', async () => {
    await registrar(
      persona({
        tipo_documento: 'ruc',
        numero_documento: RUC_20,
        tipo_cliente: 'empresa',
        razon_social: 'Distribuidora El Sol S.A.C.',
        email: `${PREFIJO}empresa@francos.test`,
        username: `${PREFIJO}empresa`,
      }),
    ).expect(201);

    const cliente = await prisma.cliente.findFirstOrThrow({
      where: { persona: { numero_documento: RUC_20 } },
      include: { persona: true },
    });
    expect(cliente).toMatchObject({
      tipo_cliente: 'empresa',
      razon_social: 'Distribuidora El Sol S.A.C.',
      persona: {
        nombres: 'Ana',
        telefono: '987654321',
        direccion: 'Av. Los Girasoles 123',
      },
    });
  });

  it('con campos vacíos responde 400 con mensajes en español', async () => {
    const response = await registrar({}).expect(400);

    expect(mensajes(response.body)).toEqual(
      expect.arrayContaining([
        'Ingresa tus nombres',
        'Ingresa tu número de documento',
        'Ingresa un correo electrónico válido',
        'La contraseña debe tener al menos 8 caracteres',
      ]),
    );
  });

  it('el primer mensaje de un campo vacío es el que pide llenarlo', async () => {
    const response = await registrar(persona({ nombres: undefined })).expect(
      400,
    );

    // El portal muestra el primer mensaje.
    expect(mensajes(response.body)[0]).toBe('Ingresa tus nombres');
  });

  it('con un DNI de 7 dígitos responde 400 explicando el formato', async () => {
    const response = await registrar(
      persona({ numero_documento: '1234567' }),
    ).expect(400);

    expect(mensajes(response.body)[0]).toContain('el DNI tiene 8 dígitos');
  });

  it('con un DNI registrado como empresa responde 400', async () => {
    const response = await registrar(
      persona({
        numero_documento: '99999952',
        tipo_cliente: 'empresa',
        razon_social: 'X',
      }),
    ).expect(400);

    expect(mensajes(response.body)).toEqual([
      'Con este documento debes registrarte como persona natural',
    ]);
  });

  it.each([
    ['el documento', {}, 'Ya existe una cuenta con ese número de documento'],
    [
      'el correo',
      { numero_documento: '99999953' },
      'Ya existe una cuenta con ese correo electrónico',
    ],
    [
      'el nombre de usuario',
      { numero_documento: '99999953', email: `${PREFIJO}otro@francos.test` },
      'Ese nombre de usuario ya está en uso',
    ],
  ])('si %s ya existe responde 409', async (_, overrides, mensaje) => {
    const response = await registrar(persona(overrides)).expect(409);

    expect(mensajes(response.body)).toEqual([mensaje]);
  });
});
