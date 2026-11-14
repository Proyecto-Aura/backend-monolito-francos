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

// Cliente del portal (HU-B-001): inicia sesión con email o username.
const CLIENTE = {
  username: 'e2e-cliente-login',
  email: 'e2e-cliente-login@francos.test',
  password: 'ClienteE2e123',
  documento: '99999961',
};

const SEGUNDOS_POR_DIA = 24 * 60 * 60;

describe('Iniciar sesión del cliente (e2e, HU-B-001)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const login = (body: object) =>
    request(app.getHttpServer()).post('/api/v1/auth/login').send(body);

  // Días de vida de la cookie del refresh token, según su Max-Age.
  const diasDeLaCookie = (setCookie: string[] | string | undefined) => {
    const cookie = [setCookie ?? []]
      .flat()
      .find((c) => c.startsWith('refresh_token='));
    const maxAge = Number(/Max-Age=(\d+)/.exec(cookie ?? '')?.[1]);
    return Math.round(maxAge / SEGUNDOS_POR_DIA);
  };

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

  it.each([
    ['username', CLIENTE.username],
    ['email', CLIENTE.email],
  ])('inicia sesión con su %s y recibe el rol cliente', async (_, id) => {
    const response = await login({
      identificador: id,
      password: CLIENTE.password,
    }).expect(201);

    expect(response.body).toMatchObject({
      access_token: expect.any(String) as string,
      roles: ['cliente'],
    });
  });

  it('sin "recordar" la sesión dura los días por defecto', async () => {
    const response = await login({
      identificador: CLIENTE.username,
      password: CLIENTE.password,
    }).expect(201);

    expect(diasDeLaCookie(response.headers['set-cookie'])).toBe(
      envs.refreshTokenExpiresInDays,
    );
  });

  it('con "recordar" la sesión dura 30 días', async () => {
    const response = await login({
      identificador: CLIENTE.username,
      password: CLIENTE.password,
      recordar: true,
    }).expect(201);

    expect(diasDeLaCookie(response.headers['set-cookie'])).toBe(30);
  });

  it('con la contraseña incorrecta responde 401 "Credenciales inválidas"', async () => {
    const response = await login({
      identificador: CLIENTE.username,
      password: 'otra-clave',
    }).expect(401);

    expect((response.body as { message: string }).message).toBe(
      'Credenciales inválidas',
    );
  });

  it('con un usuario que no existe responde el mismo 401', async () => {
    await login({
      identificador: 'no-existe-e2e',
      password: CLIENTE.password,
    }).expect(401);
  });

  it('con campos vacíos responde 400', async () => {
    await login({ identificador: '', password: '' }).expect(400);
  });

  it('"recordar" debe ser booleano (400)', async () => {
    await login({
      identificador: CLIENTE.username,
      password: CLIENTE.password,
      recordar: 'si',
    }).expect(400);
  });

  // Portal cliente y portal empresa comparten este backend: si usaran la
  // misma cookie, loguearse en uno pisaría la sesión del otro en el mismo
  // navegador. Cada Origin debe recibir y poder renovar SU PROPIA cookie.
  describe('la cookie de sesión se separa por app (Origin)', () => {
    const cookieLlamada = (
      setCookie: string[] | string | undefined,
      nombre: string,
    ) => [setCookie ?? []].flat().find((c) => c.startsWith(`${nombre}=`));

    it('con Origin del portal cliente, la cookie se llama refresh_token_cliente', async () => {
      const response = await login({
        identificador: CLIENTE.username,
        password: CLIENTE.password,
      })
        .set('Origin', envs.frontendStoreUrl)
        .expect(201);

      expect(
        cookieLlamada(response.headers['set-cookie'], 'refresh_token_cliente'),
      ).toBeDefined();
    });

    it('con Origin del portal empresa, la cookie se llama refresh_token_empresa', async () => {
      const response = await login({
        identificador: CLIENTE.username,
        password: CLIENTE.password,
      })
        .set('Origin', envs.frontendPortalUrl)
        .expect(201);

      expect(
        cookieLlamada(response.headers['set-cookie'], 'refresh_token_empresa'),
      ).toBeDefined();
    });

    it('sin un Origin reconocido, usa el nombre histórico refresh_token', async () => {
      const response = await login({
        identificador: CLIENTE.username,
        password: CLIENTE.password,
      })
        .set('Origin', 'http://un-origen-desconocido.test')
        .expect(201);

      expect(
        cookieLlamada(response.headers['set-cookie'], 'refresh_token'),
      ).toBeDefined();
    });

    it('con ambas cookies presentes, /auth/refresh usa la del Origin correcto y no una sesión revocada de la otra app', async () => {
      const loginCliente = await login({
        identificador: CLIENTE.username,
        password: CLIENTE.password,
      })
        .set('Origin', envs.frontendStoreUrl)
        .expect(201);
      const loginEmpresa = await login({
        identificador: CLIENTE.username,
        password: CLIENTE.password,
      })
        .set('Origin', envs.frontendPortalUrl)
        .expect(201);

      const cookieCliente = cookieLlamada(
        loginCliente.headers['set-cookie'],
        'refresh_token_cliente',
      )!.split(';')[0];
      const cookieEmpresa = cookieLlamada(
        loginEmpresa.headers['set-cookie'],
        'refresh_token_empresa',
      )!.split(';')[0];

      // Simula que la sesión del portal empresa ya se cerró/revocó en algún
      // momento: si /auth/refresh igual la usara por error, esto fallaría.
      const tokenPlanoEmpresa = decodeURIComponent(cookieEmpresa.split('=')[1]);
      await prisma.refreshToken.updateMany({
        where: { token_hash: hashToken(tokenPlanoEmpresa) },
        data: { revoked_at: new Date() },
      });

      // El navegador manda las dos cookies juntas (mismo dominio); con
      // Origin del portal cliente debe renovar con la de cliente, vigente.
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Origin', envs.frontendStoreUrl)
        .set('Cookie', `${cookieCliente}; ${cookieEmpresa}`)
        .expect(201);

      // Y con Origin del portal empresa, como esa sesión está revocada, debe
      // fallar — confirma que antes no "se coló" la de cliente por error.
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Origin', envs.frontendPortalUrl)
        .set('Cookie', `${cookieCliente}; ${cookieEmpresa}`)
        .expect(401);
    });
  });
});
