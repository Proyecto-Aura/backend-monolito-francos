import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { S3Service } from '../src/infrastructure/storage/s3.service';
import { FakeS3Service } from './fake-s3.service';
import { envs } from '../src/config/envs';

// Datos exclusivos de esta suite (prefijo e2e-485, DNI 9999485x).
const ADMIN = { identificador: 'admin', password: 'admin123' };
const VENTAS = {
  username: 'e2e-485-ventas',
  email: 'e2e-485-ventas@francos.test',
  password: 'VentasE2e485',
  dni: '99994851',
};
const LUCIA = {
  username: 'e2e-485-lucia',
  username_nuevo: 'e2e-485-lucia2',
  email: 'e2e-485-lucia@francos.test',
  password: 'ClaveLucia485',
  password_nueva: 'ClaveNueva485',
  dni: '99994852',
};
const INACTIVO = {
  username: 'e2e-485-inactivo',
  email: 'e2e-485-inactivo@francos.test',
  password: 'ClaveInactivo485',
  dni: '99994853',
};
const CLIENTE = {
  username: 'e2e-485-cliente',
  email: 'e2e-485-cliente@francos.test',
  dni: '99994854',
};
const DNI_LIBRE = '99994855';
const MIXTO = {
  username: 'e2e-485-mixto',
  email: 'e2e-485-mixto@francos.test',
  dni: '99994856',
};
const DNIS = [
  VENTAS.dni,
  LUCIA.dni,
  INACTIVO.dni,
  CLIENTE.dni,
  DNI_LIBRE,
  MIXTO.dni,
];

interface UsuarioHttp {
  id: string;
  username: string;
  email: string;
  nombres: string;
  estado: boolean;
  debe_cambiar_contrasena: boolean;
  roles: { id: number; nombre: string }[];
  foto_url: string | null;
  cargo: string | null;
  area: string | null;
  fecha_ingreso: string | null;
}
interface ListadoHttp {
  data: UsuarioHttp[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

describe('Usuarios internos (e2e)', () => {
  const s3 = new FakeS3Service();
  const subirArchivo = jest.spyOn(s3, 'upload');
  const borrarArchivo = jest.spyOn(s3, 'delete');
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let ventasToken: string;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  let rolIds: Record<'admin' | 'ventas' | 'inventario' | 'cliente', number>;
  let luciaId: string;
  let inactivoId: string;
  let clienteUserId: string;

  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const login = (identificador: string, password: string) =>
    http().post('/api/v1/auth/login').send({ identificador, password });

  const refreshCookieOf = (response: request.Response): string => {
    const cookies = response.headers['set-cookie'] as unknown as string[];
    return cookies.find((cookie) => cookie.startsWith('refresh_token='))!;
  };

  const nuevoUsuario = (overrides: Record<string, unknown> = {}) => ({
    nombres: 'Lucia',
    apellido_paterno: 'Quispe',
    apellido_materno: 'Huaman',
    tipo_documento: 'dni',
    numero_documento: LUCIA.dni,
    email: LUCIA.email,
    username: LUCIA.username,
    contrasena: LUCIA.password,
    rol_ids: [rolIds.ventas],
    cargo: 'Vendedora',
    area: 'ventas',
    ...overrides,
  });

  const deleteSuiteData = async () => {
    const users = await prisma.user.findMany({
      where: { persona: { numero_documento: { in: DNIS } } },
      select: { id: true },
    });
    const userIds = users.map(({ id }) => id);
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { user_id: { in: userIds } } }),
      prisma.usuarioRol.deleteMany({ where: { user_id: { in: userIds } } }),
      prisma.user.deleteMany({ where: { id: { in: userIds } } }),
      prisma.cliente.deleteMany({
        where: { persona: { numero_documento: { in: DNIS } } },
      }),
      prisma.empleado.deleteMany({
        where: { persona: { numero_documento: { in: DNIS } } },
      }),
      prisma.persona.deleteMany({ where: { numero_documento: { in: DNIS } } }),
    ]);
  };

  const createDirectUser = async (
    data: { username: string; email: string; dni: string },
    rolId: number,
    password = 'NoSeUsa12345',
  ) => {
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Usuario',
        apellido_paterno: 'Suite',
        apellido_materno: 'E2E485',
        tipo_documento: 'dni',
        numero_documento: data.dni,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: data.email,
        username: data.username,
        contrasena: await hashPassword(password),
        estado: true,
        email_verificado: true,
      },
    });
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: rolId, estado: true },
    });
    return user.id;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Service)
      .useValue(s3)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    await deleteSuiteData();

    const roles = await prisma.rol.findMany({
      where: { nombre: { in: ['admin', 'ventas', 'inventario', 'cliente'] } },
    });
    rolIds = Object.fromEntries(
      roles.map((rol) => [rol.nombre, rol.id]),
    ) as typeof rolIds;

    adminUserId = (
      await prisma.user.findUniqueOrThrow({
        where: { username: ADMIN.identificador },
        select: { id: true },
      })
    ).id;
    existingAdminRefreshTokenIds = (
      await prisma.refreshToken.findMany({
        where: { user_id: adminUserId },
        select: { id: true },
      })
    ).map(({ id }) => id);

    await createDirectUser(VENTAS, rolIds.ventas, VENTAS.password);
    clienteUserId = await createDirectUser(CLIENTE, rolIds.cliente);

    const adminLogin = await login(ADMIN.identificador, ADMIN.password);
    expect(adminLogin.status).toBe(201);
    adminToken = (adminLogin.body as { access_token: string }).access_token;
    const ventasLogin = await login(VENTAS.username, VENTAS.password);
    expect(ventasLogin.status).toBe(201);
    ventasToken = (ventasLogin.body as { access_token: string }).access_token;
  }, 30_000);

  afterAll(async () => {
    await deleteSuiteData();
    await prisma.refreshToken.deleteMany({
      where: {
        user_id: adminUserId,
        id: { notIn: existingAdminRefreshTokenIds },
      },
    });
    await app.close();
  }, 30_000);

  it('GET /api/v1/usuarios sin token devuelve 401', async () => {
    await http().get('/api/v1/usuarios').expect(401);
  });

  it('GET /api/v1/usuarios con rol ventas devuelve 403', async () => {
    await http().get('/api/v1/usuarios').set(auth(ventasToken)).expect(403);
    await http()
      .post('/api/v1/usuarios')
      .set(auth(ventasToken))
      .send(nuevoUsuario())
      .expect(403);
  });

  it('POST crea persona, empleado y usuario y GET conserva los datos laborales', async () => {
    const response = await http()
      .post('/api/v1/usuarios')
      .set(auth(adminToken))
      .send(nuevoUsuario({ fecha_ingreso: '2026-11-01', area: 'gerencia' }))
      .expect(201);

    const body = response.body as UsuarioHttp;
    luciaId = body.id;
    expect(body).toMatchObject({
      username: LUCIA.username,
      email: LUCIA.email,
      nombres: 'Lucia',
      estado: true,
      debe_cambiar_contrasena: true,
      roles: [{ id: rolIds.ventas, nombre: 'ventas' }],
      cargo: 'Vendedora',
      area: 'gerencia',
      fecha_ingreso: '2026-11-01T00:00:00.000Z',
    });
    expect(body).not.toHaveProperty('contrasena');
    expect(Object.keys(body).filter((key) => key.startsWith('token_'))).toEqual(
      [],
    );

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: luciaId },
      select: { contrasena: true },
    });
    expect(user.contrasena).not.toBe(LUCIA.password);

    const persona = await prisma.persona.findUniqueOrThrow({
      where: { numero_documento: LUCIA.dni },
      include: { empleado: true, user: true },
    });
    expect(persona.user?.id).toBe(luciaId);
    expect(persona.empleado).toMatchObject({
      persona_id: persona.id,
      cargo: 'Vendedora',
      area: 'gerencia',
      fecha_ingreso: new Date('2026-11-01'),
    });
    expect(
      await prisma.empleado.count({ where: { persona_id: persona.id } }),
    ).toBe(1);
    const detalle = await http()
      .get(`/api/v1/usuarios/${luciaId}`)
      .set(auth(adminToken))
      .expect(200);
    expect(detalle.body).toMatchObject({
      cargo: body.cargo,
      area: body.area,
      fecha_ingreso: body.fecha_ingreso,
    });
  });

  it('GET de un usuario antiguo sin empleado devuelve campos laborales null', async () => {
    const antiguo = await prisma.user.findUniqueOrThrow({
      where: { username: VENTAS.username },
    });
    const response = await http()
      .get(`/api/v1/usuarios/${antiguo.id}`)
      .set(auth(adminToken))
      .expect(200);
    expect(response.body).toMatchObject({
      cargo: null,
      area: null,
      fecha_ingreso: null,
    });
  });

  it('el usuario creado inicia sesión con el username y la contraseña elegidos', async () => {
    const response = await login(LUCIA.username, LUCIA.password).expect(201);
    expect((response.body as { roles: string[] }).roles).toEqual(['ventas']);
    await login(LUCIA.email, LUCIA.password).expect(201);
  });

  it.each([
    ['documento', { email: 'otro-485@francos.test', username: 'e2e-485-otro' }],
    ['email', { numero_documento: DNI_LIBRE, username: 'e2e-485-otro' }],
    [
      'username',
      { numero_documento: DNI_LIBRE, email: 'otro-485@francos.test' },
    ],
  ])('POST con %s duplicado devuelve 409', async (_campo, overrides) => {
    await http()
      .post('/api/v1/usuarios')
      .set(auth(adminToken))
      .send(nuevoUsuario(overrides))
      .expect(409);
  });

  it('POST con rol cliente devuelve 409 y con rol inexistente 404', async () => {
    const libre = {
      numero_documento: DNI_LIBRE,
      email: 'otro-485@francos.test',
      username: 'e2e-485-otro',
    };
    await http()
      .post('/api/v1/usuarios')
      .set(auth(adminToken))
      .send(nuevoUsuario({ ...libre, rol_ids: [rolIds.cliente] }))
      .expect(409);
    await http()
      .post('/api/v1/usuarios')
      .set(auth(adminToken))
      .send(nuevoUsuario({ ...libre, rol_ids: [999_999] }))
      .expect(404);
  });

  it.each([
    ['email inválido', { email: 'no-es-email' }],
    ['sin roles', { rol_ids: [] }],
    ['username con @', { username: 'lucia@francos' }],
    ['contraseña corta', { contrasena: 'corta' }],
    ['DNI mal formado', { numero_documento: '123' }],
    ['campo no permitido', { persona_id: 'x' }],
    ['sin cargo', { cargo: undefined }],
    ['cargo vacio', { cargo: '' }],
    ['cargo demasiado largo', { cargo: 'x'.repeat(101) }],
    ['area numerica', { area: 123 }],
    ['area demasiado larga', { area: 'x'.repeat(101) }],
    ['fecha de ingreso invalida', { fecha_ingreso: 'ayer' }],
  ])('POST con %s devuelve 400', async (_caso, overrides) => {
    await http()
      .post('/api/v1/usuarios')
      .set(auth(adminToken))
      .send(nuevoUsuario({ numero_documento: DNI_LIBRE, ...overrides }))
      .expect(400);
    expect(
      await prisma.persona.count({ where: { numero_documento: DNI_LIBRE } }),
    ).toBe(0);
  });

  it('POST con estado=false crea un usuario que no puede iniciar sesión', async () => {
    const diasEsperados = [new Date().toISOString().slice(0, 10)];
    const response = await http()
      .post('/api/v1/usuarios')
      .set(auth(adminToken))
      .send(
        nuevoUsuario({
          numero_documento: INACTIVO.dni,
          email: INACTIVO.email,
          username: INACTIVO.username,
          contrasena: INACTIVO.password,
          rol_ids: [rolIds.inventario],
          estado: false,
          area: undefined,
        }),
      )
      .expect(201);
    inactivoId = (response.body as UsuarioHttp).id;
    diasEsperados.push(new Date().toISOString().slice(0, 10));
    const body = response.body as UsuarioHttp;
    expect(body).toMatchObject({ cargo: 'Vendedora', area: null });
    expect(diasEsperados).toContain(body.fecha_ingreso?.slice(0, 10));
    const empleado = await prisma.empleado.findFirstOrThrow({
      where: { persona: { user: { id: inactivoId } } },
    });
    expect(empleado.fecha_ingreso?.toISOString()).toBe(body.fecha_ingreso);
    expect(empleado.area).toBeNull();

    await login(INACTIVO.username, INACTIVO.password).expect(401);
  });

  it('GET lista solo usuarios internos, con búsqueda y filtros por rol y estado', async () => {
    const buscar = async (query: Record<string, string>) =>
      (
        await http()
          .get('/api/v1/usuarios')
          .query(query)
          .set(auth(adminToken))
          .expect(200)
      ).body as ListadoHttp;

    const todos = await buscar({ search: 'e2e-485', limit: '100' });
    const usernames = todos.data.map((usuario) => usuario.username);
    expect(usernames).toEqual(
      expect.arrayContaining([
        VENTAS.username,
        LUCIA.username,
        INACTIVO.username,
      ]),
    );
    expect(usernames).not.toContain(CLIENTE.username);
    expect(todos.meta).toMatchObject({ total: 3, page: 1, limit: 100 });

    const porRol = await buscar({ search: 'e2e-485', rol: 'inventario' });
    expect(porRol.data.map((usuario) => usuario.username)).toEqual([
      INACTIVO.username,
    ]);

    const inactivos = await buscar({ search: 'e2e-485', estado: 'false' });
    expect(inactivos.data.map((usuario) => usuario.username)).toEqual([
      INACTIVO.username,
    ]);

    const porApellido = await buscar({ search: 'huaman', rol: 'ventas' });
    expect(porApellido.data.map((usuario) => usuario.username)).toContain(
      LUCIA.username,
    );

    const paginado = await buscar({ search: 'e2e-485', page: '2', limit: '2' });
    expect(paginado.data).toHaveLength(1);
    expect(paginado.meta).toEqual({
      total: 3,
      page: 2,
      limit: 2,
      total_pages: 2,
    });

    expect(await buscar({ search: CLIENTE.username })).toMatchObject({
      data: [],
      meta: { total: 0 },
    });
  });

  it('GET /:id devuelve el usuario interno y 404 para un cliente', async () => {
    await http()
      .get(`/api/v1/usuarios/${luciaId}`)
      .set(auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect((response.body as UsuarioHttp).username).toBe(LUCIA.username);
      });
    await http()
      .get(`/api/v1/usuarios/${clienteUserId}`)
      .set(auth(adminToken))
      .expect(404);
  });

  it('PATCH edita username y nombres; 409 si el username ya existe', async () => {
    await http()
      .patch(`/api/v1/usuarios/${luciaId}`)
      .set(auth(adminToken))
      .send({ username: LUCIA.username_nuevo, nombres: 'Lucía' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          username: LUCIA.username_nuevo,
          nombres: 'Lucía',
        });
      });

    await http()
      .patch(`/api/v1/usuarios/${luciaId}`)
      .set(auth(adminToken))
      .send({ username: VENTAS.username })
      .expect(409);
    await http()
      .patch(`/api/v1/usuarios/${luciaId}`)
      .set(auth(adminToken))
      .send({ email: 'nuevo-485@francos.test' })
      .expect(400);
  });

  it('PATCH con contraseña nueva revoca los refresh tokens', async () => {
    const sesion = await login(LUCIA.username_nuevo, LUCIA.password).expect(
      201,
    );
    const cookie = refreshCookieOf(sesion);

    await http()
      .patch(`/api/v1/usuarios/${luciaId}`)
      .set(auth(adminToken))
      .send({ contrasena: LUCIA.password_nueva })
      .expect(200);

    await http().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);
    await login(LUCIA.username_nuevo, LUCIA.password).expect(401);
    await login(LUCIA.username_nuevo, LUCIA.password_nueva).expect(201);
  });

  it('PUT /:id/roles reemplaza los roles; 409 con cliente y 400 sin roles', async () => {
    await http()
      .put(`/api/v1/usuarios/${luciaId}/roles`)
      .set(auth(adminToken))
      .send({ rol_ids: [rolIds.inventario, rolIds.ventas] })
      .expect(200)
      .expect((response) => {
        expect(
          (response.body as UsuarioHttp).roles.map((rol) => rol.nombre).sort(),
        ).toEqual(['inventario', 'ventas']);
      });

    await http()
      .put(`/api/v1/usuarios/${luciaId}/roles`)
      .set(auth(adminToken))
      .send({ rol_ids: [rolIds.inventario] })
      .expect(200);
    const response = await login(
      LUCIA.username_nuevo,
      LUCIA.password_nueva,
    ).expect(201);
    expect((response.body as { roles: string[] }).roles).toEqual([
      'inventario',
    ]);

    await http()
      .put(`/api/v1/usuarios/${luciaId}/roles`)
      .set(auth(adminToken))
      .send({ rol_ids: [rolIds.cliente] })
      .expect(409);
    await http()
      .put(`/api/v1/usuarios/${luciaId}/roles`)
      .set(auth(adminToken))
      .send({ rol_ids: [] })
      .expect(400);
  });

  it('PUT /:id/roles conserva una asignación previa a cliente y desactiva (sin borrar) los roles que salen', async () => {
    const creado = await http()
      .post('/api/v1/usuarios')
      .set(auth(adminToken))
      .send(
        nuevoUsuario({
          numero_documento: MIXTO.dni,
          email: MIXTO.email,
          username: MIXTO.username,
          rol_ids: [rolIds.ventas],
        }),
      )
      .expect(201);
    const mixtoId = (creado.body as UsuarioHttp).id;
    await prisma.usuarioRol.create({
      data: { user_id: mixtoId, rol_id: rolIds.cliente, estado: true },
    });

    await http()
      .put(`/api/v1/usuarios/${mixtoId}/roles`)
      .set(auth(adminToken))
      .send({ rol_ids: [rolIds.inventario] })
      .expect(200);

    const filas = await prisma.usuarioRol.findMany({
      where: { user_id: mixtoId },
      select: { rol_id: true, estado: true },
    });
    const estadoDe = (rolId: number) =>
      filas.find((fila) => fila.rol_id === rolId)?.estado;
    expect(filas).toHaveLength(3);
    expect(estadoDe(rolIds.cliente)).toBe(true);
    expect(estadoDe(rolIds.ventas)).toBe(false);
    expect(estadoDe(rolIds.inventario)).toBe(true);
  });

  it('DELETE desactiva: el login y el refresh fallan; PATCH /activate reactiva', async () => {
    const sesion = await login(
      LUCIA.username_nuevo,
      LUCIA.password_nueva,
    ).expect(201);
    const cookie = refreshCookieOf(sesion);

    await http()
      .delete(`/api/v1/usuarios/${luciaId}`)
      .set(auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect((response.body as UsuarioHttp).estado).toBe(false);
      });

    await login(LUCIA.username_nuevo, LUCIA.password_nueva).expect(401);
    await http().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);
    await expect(
      prisma.refreshToken.count({
        where: { user_id: luciaId, revoked_at: null },
      }),
    ).resolves.toBe(0);

    await http()
      .patch(`/api/v1/usuarios/${luciaId}/activate`)
      .set(auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect((response.body as UsuarioHttp).estado).toBe(true);
      });
    await login(LUCIA.username_nuevo, LUCIA.password_nueva).expect(201);

    await http()
      .patch(`/api/v1/usuarios/${inactivoId}/activate`)
      .set(auth(adminToken))
      .expect(200);
    await login(INACTIVO.username, INACTIVO.password).expect(201);
  });

  it('autoprotección: el admin no se desactiva ni se quita admin (409)', async () => {
    await http()
      .delete(`/api/v1/usuarios/${adminUserId}`)
      .set(auth(adminToken))
      .expect(409);
    await http()
      .put(`/api/v1/usuarios/${adminUserId}/roles`)
      .set(auth(adminToken))
      .send({ rol_ids: [rolIds.ventas] })
      .expect(409);

    const admin = await prisma.user.findUniqueOrThrow({
      where: { id: adminUserId },
      select: {
        estado: true,
        usuario_roles: {
          where: { estado: true },
          select: { rol: { select: { nombre: true } } },
        },
      },
    });
    expect(admin.estado).toBe(true);
    expect(admin.usuario_roles.map(({ rol }) => rol.nombre)).toContain('admin');
  });

  describe('foto del usuario interno', () => {
    // PNG valido de un pixel, enviado como multipart a traves del controller.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=',
      'base64',
    );
    const urlAnterior = 'https://media.test/usuarios/anterior.png';
    let usuarioId: string;
    let personaId: string;
    const urlFoto = (id = usuarioId) => `/api/v1/usuarios/${id}/foto`;
    const fotoGuardada = async () =>
      (await prisma.persona.findUniqueOrThrow({ where: { id: personaId } }))
        .foto_url;
    const subir = (buffer = png, id = usuarioId, contentType = 'image/png') =>
      http().post(urlFoto(id)).set(auth(adminToken)).attach('foto', buffer, {
        filename: 'foto.png',
        contentType,
      });

    beforeAll(async () => {
      const usuario = await prisma.user.findUniqueOrThrow({
        where: { username: VENTAS.username },
      });
      usuarioId = usuario.id;
      personaId = usuario.persona_id;
    });

    beforeEach(async () => {
      subirArchivo.mockClear();
      borrarArchivo.mockClear();
      await prisma.persona.update({
        where: { id: personaId },
        data: { foto_url: urlAnterior },
      });
    });

    it.each(['post', 'delete'] as const)(
      '%s sin token devuelve 401',
      async (metodo) => {
        const req = http()[metodo](urlFoto());
        await (
          metodo === 'post' ? req.attach('foto', png, 'foto.png') : req
        ).expect(401);
        await expect(fotoGuardada()).resolves.toBe(urlAnterior);
        expect(subirArchivo).not.toHaveBeenCalled();
      },
    );

    it.each(['post', 'delete'] as const)(
      '%s con rol ventas devuelve 403',
      async (metodo) => {
        const req = http()[metodo](urlFoto()).set(auth(ventasToken));
        await (
          metodo === 'post' ? req.attach('foto', png, 'foto.png') : req
        ).expect(403);
        await expect(fotoGuardada()).resolves.toBe(urlAnterior);
        expect(subirArchivo).not.toHaveBeenCalled();
      },
    );

    it.each([
      { metodo: 'post' as const, caso: 'inexistente' },
      { metodo: 'delete' as const, caso: 'inexistente' },
      { metodo: 'post' as const, caso: 'cliente' },
      { metodo: 'delete' as const, caso: 'cliente' },
    ])('$metodo devuelve 404 para usuario $caso', async ({ metodo, caso }) => {
      const id =
        caso === 'cliente'
          ? clienteUserId
          : '1b4e28ba-2fa1-4d3b-a3f5-ef19b5a7633b';
      const req = http()[metodo](urlFoto(id)).set(auth(adminToken));
      await (
        metodo === 'post' ? req.attach('foto', png, 'foto.png') : req
      ).expect(404);
      expect(subirArchivo).not.toHaveBeenCalled();
      await expect(fotoGuardada()).resolves.toBe(urlAnterior);
    });

    it.each(['post', 'delete'] as const)(
      '%s valida el UUID: 400',
      async (metodo) => {
        const req = http()[metodo](urlFoto('no-es-uuid')).set(auth(adminToken));
        await (
          metodo === 'post' ? req.attach('foto', png, 'foto.png') : req
        ).expect(400);
        expect(subirArchivo).not.toHaveBeenCalled();
      },
    );

    it('requiere el campo multipart foto: 400', async () => {
      await http().post(urlFoto()).set(auth(adminToken)).expect(400);
      expect(subirArchivo).not.toHaveBeenCalled();
      await expect(fotoGuardada()).resolves.toBe(urlAnterior);
    });

    it.each([
      {
        nombre: 'texto disfrazado de PNG',
        buffer: Buffer.from('no es una imagen'),
      },
      { nombre: 'firma PNG truncada', buffer: png.subarray(0, 7) },
      { nombre: 'WebP', buffer: Buffer.from('RIFF0000WEBPVP8 ') },
    ])('rechaza $nombre aunque declare image/png: 400', async ({ buffer }) => {
      await subir(buffer).expect(400);
      expect(subirArchivo).not.toHaveBeenCalled();
      await expect(fotoGuardada()).resolves.toBe(urlAnterior);
    });

    it('rechaza mas de 1 MB con 400 y conserva la foto anterior', async () => {
      await subir(Buffer.concat([png, Buffer.alloc(1024 * 1024)])).expect(400);
      expect(subirArchivo).not.toHaveBeenCalled();
      await expect(fotoGuardada()).resolves.toBe(urlAnterior);
    });

    it('sube PNG real con 201 y expone la URL en usuario, listado y auth/me', async () => {
      const response = await subir().expect(201);
      const { foto_url } = response.body as UsuarioHttp;
      expect(foto_url).toMatch(/\/usuarios\/[0-9a-f-]{36}\.png$/);
      const key = foto_url!.slice(foto_url!.lastIndexOf('/usuarios/') + 1);
      expect(foto_url).toBe(`${envs.mediaBaseUrl}/${key}`);
      expect(s3.objeto('media', key)).toEqual({
        body: png,
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000, immutable',
      });
      await expect(fotoGuardada()).resolves.toBe(foto_url);
      const detalle = await http()
        .get(`/api/v1/usuarios/${usuarioId}`)
        .set(auth(adminToken))
        .expect(200);
      expect((detalle.body as UsuarioHttp).foto_url).toBe(foto_url);
      const listado = await http()
        .get('/api/v1/usuarios')
        .query({ search: VENTAS.username })
        .set(auth(adminToken))
        .expect(200);
      expect((listado.body as ListadoHttp).data).toContainEqual(
        expect.objectContaining({ id: usuarioId, foto_url }),
      );
      const me = await http()
        .get('/api/v1/auth/me')
        .set(auth(ventasToken))
        .expect(200);
      expect(me.body).toHaveProperty('foto_url', foto_url);
    });

    it('acepta exactamente 1 MB', async () => {
      const buffer = Buffer.alloc(1024 * 1024);
      png.copy(buffer);
      await subir(buffer).expect(201);
      expect(subirArchivo).toHaveBeenCalledTimes(1);
    });

    it('reemplaza la foto con key nueva y conserva el objeto anterior', async () => {
      const primera = (await subir().expect(201)).body as UsuarioHttp;
      const segunda = (
        await subir(png, usuarioId, 'application/octet-stream').expect(201)
      ).body as UsuarioHttp;
      expect(segunda.foto_url).not.toBe(primera.foto_url);
      for (const foto_url of [primera.foto_url!, segunda.foto_url!]) {
        expect(
          s3.existe(
            'media',
            foto_url.slice(foto_url.lastIndexOf('/usuarios/') + 1),
          ),
        ).toBe(true);
      }
      expect(borrarArchivo).not.toHaveBeenCalled();
      await expect(fotoGuardada()).resolves.toBe(segunda.foto_url);
    });

    it('DELETE devuelve 200, limpia la URL y conserva el archivo en media', async () => {
      const subida = (await subir().expect(201)).body as UsuarioHttp;
      const response = await http()
        .delete(urlFoto())
        .set(auth(adminToken))
        .expect(200);
      expect((response.body as UsuarioHttp).foto_url).toBeNull();
      await expect(fotoGuardada()).resolves.toBeNull();
      const me = await http()
        .get('/api/v1/auth/me')
        .set(auth(ventasToken))
        .expect(200);
      expect(me.body).toHaveProperty('foto_url', null);
      expect(
        s3.existe(
          'media',
          subida.foto_url!.slice(
            subida.foto_url!.lastIndexOf('/usuarios/') + 1,
          ),
        ),
      ).toBe(true);
      expect(borrarArchivo).not.toHaveBeenCalled();
    });

    it('permite quitar la foto cuando ya esta vacia', async () => {
      await prisma.persona.update({
        where: { id: personaId },
        data: { foto_url: null },
      });
      const response = await http()
        .delete(urlFoto())
        .set(auth(adminToken))
        .expect(200);
      expect((response.body as UsuarioHttp).foto_url).toBeNull();
      expect(subirArchivo).not.toHaveBeenCalled();
      expect(borrarArchivo).not.toHaveBeenCalled();
    });
  });

  it('404 para un id inexistente y 400 para un id que no es uuid', async () => {
    await http()
      .get('/api/v1/usuarios/1b4e28ba-2fa1-4d3b-a3f5-ef19b5a7633b')
      .set(auth(adminToken))
      .expect(404);
    await http()
      .get('/api/v1/usuarios/no-es-uuid')
      .set(auth(adminToken))
      .expect(400);
  });
});
