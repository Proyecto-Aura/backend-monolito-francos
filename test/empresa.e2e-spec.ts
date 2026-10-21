import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';

// HU-A-039 Gestionar datos de la empresa (OFT0-473).
const ADMIN_CREDENTIALS = { identificador: 'admin', password: 'admin123' };
const VENTAS = {
  identificador: 'e2e-ventas-empresa',
  password: 'VentasE2e123',
  email: 'e2e-ventas-empresa@francos.test',
  documento: '99994730',
};

// RUC reconocibles: solo se borran las empresas que crea este archivo.
const RUC_EMISORA = '20999990473';
const RUC_OTRA = '20999991473';
const MARCA = 'E2E OFT0-473';

const URL_EMISORA = '/api/v1/empresa';
const URL_EMPRESAS = '/api/v1/empresas';

interface EmpresaHttp {
  id: number;
  razon_social: string;
  ruc: string;
  direccion: string;
  telefono: string | null;
  email: string | null;
  logo_url: string | null;
  estado: boolean;
  es_emisora: boolean;
}

describe('Empresa emisora HU-A-039 (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let ventasToken: string;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  // Emisora que ya hubiera en la base: se aparta durante la prueba y se restaura.
  let emisoraPreviaId: number | null = null;
  let emisoraId: number;

  const admin = () => ({ Authorization: `Bearer ${adminToken}` });
  const ventas = () => ({ Authorization: `Bearer ${ventasToken}` });
  const put = (body: object) =>
    request(app.getHttpServer()).put(URL_EMISORA).set(admin()).send(body);

  const login = async (identificador: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador, password });
    expect([200, 201]).toContain(res.status);
    return (res.body as { access_token: string }).access_token;
  };

  const limpiarEmpresas = () =>
    prisma.empresa.deleteMany({
      where: { ruc: { in: [RUC_EMISORA, RUC_OTRA] } },
    });

  const borrarUsuarioVentas = async () => {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: VENTAS.identificador }, { email: VENTAS.email }],
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
        where: { numero_documento: VENTAS.documento },
      });
    }
  };

  const crearUsuarioVentas = async () => {
    const rol = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ventas' },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Usuario',
        apellido_paterno: 'ventas',
        apellido_materno: 'Empresa E2E',
        tipo_documento: 'dni',
        numero_documento: VENTAS.documento,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: VENTAS.email,
        username: VENTAS.identificador,
        contrasena: await hashPassword(VENTAS.password),
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

    // Restos de una corrida anterior que haya quedado a medias.
    await limpiarEmpresas();
    await borrarUsuarioVentas();

    const previa = await prisma.empresa.findFirst({
      where: { es_emisora: true },
      select: { id: true },
    });
    if (previa) {
      emisoraPreviaId = previa.id;
      await prisma.empresa.update({
        where: { id: previa.id },
        data: { es_emisora: false },
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

    await crearUsuarioVentas();
    adminToken = await login(
      ADMIN_CREDENTIALS.identificador,
      ADMIN_CREDENTIALS.password,
    );
    ventasToken = await login(VENTAS.identificador, VENTAS.password);
  });

  afterAll(async () => {
    await limpiarEmpresas();
    if (emisoraPreviaId !== null) {
      await prisma.empresa.update({
        where: { id: emisoraPreviaId },
        data: { es_emisora: true },
      });
    }
    await borrarUsuarioVentas();
    await prisma.refreshToken.deleteMany({
      where: {
        user_id: adminUserId,
        id: { notIn: existingAdminRefreshTokenIds },
      },
    });
    await app.close();
  });

  it('responde 401 sin token', async () => {
    await request(app.getHttpServer()).get(URL_EMISORA).expect(401);
    await request(app.getHttpServer())
      .put(URL_EMISORA)
      .send({ razon_social: MARCA })
      .expect(401);
  });

  it('responde 403 al rol ventas en /empresa y en /empresas', async () => {
    await request(app.getHttpServer())
      .get(URL_EMISORA)
      .set(ventas())
      .expect(403);
    await request(app.getHttpServer())
      .put(URL_EMISORA)
      .set(ventas())
      .send({
        razon_social: `${MARCA} Ventas`,
        ruc: RUC_EMISORA,
        direccion: 'Av. Ventas 1',
      })
      .expect(403);
    await request(app.getHttpServer())
      .get(URL_EMPRESAS)
      .set(ventas())
      .expect(403);
  });

  it('responde 404 si no hay empresa emisora configurada', async () => {
    await request(app.getHttpServer())
      .get(URL_EMISORA)
      .set(admin())
      .expect(404);
  });

  it('valida los datos de entrada (400)', async () => {
    await put({
      razon_social: `${MARCA} Emisora`,
      ruc: '123',
      direccion: 'Av. Principal 100',
    }).expect(400);
    await put({ razon_social: `${MARCA} Emisora`, ruc: RUC_EMISORA }).expect(
      400,
    );
    await put({
      razon_social: `${MARCA} Emisora`,
      ruc: RUC_EMISORA,
      direccion: 'Av. Principal 100',
      logo_url: 'no-es-una-url',
    }).expect(400);
    await put({
      razon_social: `${MARCA} Emisora`,
      ruc: RUC_EMISORA,
      direccion: 'Av. Principal 100',
      estado: false,
    }).expect(400);
  });

  it('PUT crea la emisora (200) y GET la devuelve', async () => {
    const res = await put({
      razon_social: `${MARCA} Emisora`,
      ruc: RUC_EMISORA,
      direccion: 'Av. Principal 100',
      telefono: '987654321',
      logo_url: 'https://cdn.francos.test/logo.png',
    }).expect(200);

    const creada = res.body as EmpresaHttp;
    expect(creada.es_emisora).toBe(true);
    expect(creada.estado).toBe(true);
    expect(creada.ruc).toBe(RUC_EMISORA);
    emisoraId = creada.id;

    const get = await request(app.getHttpServer())
      .get(URL_EMISORA)
      .set(admin())
      .expect(200);
    expect(get.body as EmpresaHttp).toMatchObject({
      id: emisoraId,
      razon_social: `${MARCA} Emisora`,
      direccion: 'Av. Principal 100',
      telefono: '987654321',
      logo_url: 'https://cdn.francos.test/logo.png',
      es_emisora: true,
    });
  });

  it('PUT actualiza la misma emisora y reemplaza los opcionales', async () => {
    const res = await put({
      razon_social: `${MARCA} Emisora Editada`,
      ruc: RUC_EMISORA,
      direccion: 'Jr. Nuevo 200',
    }).expect(200);

    expect(res.body as EmpresaHttp).toMatchObject({
      id: emisoraId,
      razon_social: `${MARCA} Emisora Editada`,
      direccion: 'Jr. Nuevo 200',
      telefono: null,
      logo_url: null,
      es_emisora: true,
    });
    expect(await prisma.empresa.count({ where: { es_emisora: true } })).toBe(1);
  });

  it('responde 409 si el RUC pertenece a otra empresa', async () => {
    const otra = await request(app.getHttpServer())
      .post(URL_EMPRESAS)
      .set(admin())
      .send({
        razon_social: `${MARCA} Otra`,
        ruc: RUC_OTRA,
        direccion: 'Av. Otra 300',
      })
      .expect(201);
    expect((otra.body as EmpresaHttp).es_emisora).toBe(false);

    await put({
      razon_social: `${MARCA} Emisora Editada`,
      ruc: RUC_OTRA,
      direccion: 'Jr. Nuevo 200',
    }).expect(409);
  });

  it('DELETE /empresas/:id de la emisora responde 409', async () => {
    await request(app.getHttpServer())
      .delete(`${URL_EMPRESAS}/${emisoraId}`)
      .set(admin())
      .expect(409);

    const sigue = await request(app.getHttpServer())
      .get(URL_EMISORA)
      .set(admin())
      .expect(200);
    expect((sigue.body as EmpresaHttp).estado).toBe(true);
  });
});
