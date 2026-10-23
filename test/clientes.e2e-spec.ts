import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';

// Datos exclusivos de esta suite (prefijo e2e-333, documentos 9999333x).
// MARCA va en el apellido materno de todas las personas de la suite: una búsqueda
// con ese texto devuelve solo estos clientes, sin depender de otros datos de la BD.
const MARCA = 'E2e333';
const ADMIN = { identificador: 'admin', password: 'admin123' };
const VENTAS = {
  username: 'e2e-333-ventas',
  email: 'e2e-333-ventas@francos.test',
  password: 'VentasE2e333',
  dni: '99993336',
};
const INVENTARIO = {
  username: 'e2e-333-inventario',
  email: 'e2e-333-inventario@francos.test',
  password: 'InventarioE2e333',
  dni: '99993337',
};
const ANA = {
  dni: '99993331',
  email: 'e2e-333-ana@francos.test',
  username: 'e2e-333-ana',
};
const BETO = { dni: '99993332' };
const EMPRESA = {
  ruc: '20999333301',
  razon_social: `Distribuidora Sol ${MARCA}`,
};
const INACTIVO = { dni: '99993334' };
const LUIS = { dni: '99993335' };
const DOCUMENTOS = [
  VENTAS.dni,
  INVENTARIO.dni,
  ANA.dni,
  BETO.dni,
  EMPRESA.ruc,
  INACTIVO.dni,
  LUIS.dni,
];
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000333';

interface ClienteHttp {
  id: string;
  persona_id: string;
  tipo_cliente: string;
  razon_social: string | null;
  categoria_cliente: string;
  estado: boolean;
  created_at: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  tipo_documento: string;
  numero_documento: string;
  telefono: string | null;
  direccion: string | null;
  email: string | null;
}
interface ListadoHttp {
  data: ClienteHttp[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

describe('Clientes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let ventasToken: string;
  let inventarioToken: string;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  const clienteIds: Record<
    'ana' | 'beto' | 'empresa' | 'inactivo' | 'luis',
    string
  > = { ana: '', beto: '', empresa: '', inactivo: '', luis: '' };

  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const login = (identificador: string, password: string) =>
    http().post('/api/v1/auth/login').send({ identificador, password });

  const listar = (query: Record<string, string | number> = {}) =>
    http()
      .get('/api/v1/clientes')
      .query({ search: MARCA, ...query })
      .set(auth(adminToken));

  const deleteSuiteData = async () => {
    const users = await prisma.user.findMany({
      where: { persona: { numero_documento: { in: DOCUMENTOS } } },
      select: { id: true },
    });
    const userIds = users.map(({ id }) => id);
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { user_id: { in: userIds } } }),
      prisma.usuarioRol.deleteMany({ where: { user_id: { in: userIds } } }),
      prisma.user.deleteMany({ where: { id: { in: userIds } } }),
      prisma.cliente.deleteMany({
        where: { persona: { numero_documento: { in: DOCUMENTOS } } },
      }),
      prisma.persona.deleteMany({
        where: { numero_documento: { in: DOCUMENTOS } },
      }),
    ]);
  };

  // Usuario del staff con un rol, para obtener un token con ese rol.
  const crearStaff = async (
    data: { username: string; email: string; password: string; dni: string },
    rolId: number,
  ) => {
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Staff',
        apellido_paterno: 'Suite',
        apellido_materno: MARCA,
        tipo_documento: 'dni',
        numero_documento: data.dni,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: data.email,
        username: data.username,
        contrasena: await hashPassword(data.password),
        estado: true,
        email_verificado: true,
      },
    });
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: rolId, estado: true },
    });
  };

  const crearCliente = async (data: {
    nombres: string;
    apellido_paterno: string;
    tipo_documento: 'dni' | 'ruc';
    numero_documento: string;
    tipo_cliente: 'persona_natural' | 'empresa';
    categoria_cliente: 'minorista' | 'mayorista';
    razon_social?: string;
    estado?: boolean;
  }): Promise<{ clienteId: string; personaId: string }> => {
    const persona = await prisma.persona.create({
      data: {
        nombres: data.nombres,
        apellido_paterno: data.apellido_paterno,
        apellido_materno: MARCA,
        tipo_documento: data.tipo_documento,
        numero_documento: data.numero_documento,
      },
    });
    const cliente = await prisma.cliente.create({
      data: {
        persona_id: persona.id,
        tipo_cliente: data.tipo_cliente,
        razon_social: data.razon_social ?? null,
        categoria_cliente: data.categoria_cliente,
        estado: data.estado ?? true,
      },
    });
    return { clienteId: cliente.id, personaId: persona.id };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    await deleteSuiteData();

    const roles = await prisma.rol.findMany({
      where: { nombre: { in: ['ventas', 'inventario'] } },
    });
    const rolIds = Object.fromEntries(
      roles.map((rol) => [rol.nombre, rol.id]),
    ) as Record<'ventas' | 'inventario', number>;

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

    await crearStaff(VENTAS, rolIds.ventas);
    await crearStaff(INVENTARIO, rolIds.inventario);

    // Se crean en orden: el último creado debe salir primero en el listado.
    const ana = await crearCliente({
      nombres: 'Ana',
      apellido_paterno: 'Torres',
      tipo_documento: 'dni',
      numero_documento: ANA.dni,
      tipo_cliente: 'persona_natural',
      categoria_cliente: 'minorista',
    });
    clienteIds.ana = ana.clienteId;
    // Solo Ana tiene cuenta de acceso, así que solo ella tiene correo.
    await prisma.user.create({
      data: {
        persona_id: ana.personaId,
        email: ANA.email,
        username: ANA.username,
        contrasena: await hashPassword('NoSeUsa12345'),
        estado: true,
        email_verificado: true,
      },
    });
    clienteIds.beto = (
      await crearCliente({
        nombres: 'Beto',
        apellido_paterno: 'Rojas',
        tipo_documento: 'dni',
        numero_documento: BETO.dni,
        tipo_cliente: 'persona_natural',
        categoria_cliente: 'mayorista',
      })
    ).clienteId;
    clienteIds.empresa = (
      await crearCliente({
        nombres: 'Carlos',
        apellido_paterno: 'Mendoza',
        tipo_documento: 'ruc',
        numero_documento: EMPRESA.ruc,
        tipo_cliente: 'empresa',
        categoria_cliente: 'mayorista',
        razon_social: EMPRESA.razon_social,
      })
    ).clienteId;
    clienteIds.inactivo = (
      await crearCliente({
        nombres: 'Dario',
        apellido_paterno: 'Paredes',
        tipo_documento: 'dni',
        numero_documento: INACTIVO.dni,
        tipo_cliente: 'persona_natural',
        categoria_cliente: 'minorista',
        estado: false,
      })
    ).clienteId;
    // Cliente reservado para las pruebas que modifican datos.
    clienteIds.luis = (
      await crearCliente({
        nombres: 'Luis',
        apellido_paterno: 'Quispe',
        tipo_documento: 'dni',
        numero_documento: LUIS.dni,
        tipo_cliente: 'persona_natural',
        categoria_cliente: 'minorista',
      })
    ).clienteId;

    const adminLogin = await login(ADMIN.identificador, ADMIN.password);
    expect(adminLogin.status).toBe(201);
    adminToken = (adminLogin.body as { access_token: string }).access_token;
    const ventasLogin = await login(VENTAS.username, VENTAS.password);
    expect(ventasLogin.status).toBe(201);
    ventasToken = (ventasLogin.body as { access_token: string }).access_token;
    const inventarioLogin = await login(
      INVENTARIO.username,
      INVENTARIO.password,
    );
    expect(inventarioLogin.status).toBe(201);
    inventarioToken = (inventarioLogin.body as { access_token: string })
      .access_token;
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

  describe('acceso', () => {
    it('sin token devuelve 401', async () => {
      await http().get('/api/v1/clientes').expect(401);
      await http().get(`/api/v1/clientes/${clienteIds.ana}`).expect(401);
    });

    it('con un rol que no es admin ni ventas devuelve 403', async () => {
      await http()
        .get('/api/v1/clientes')
        .set(auth(inventarioToken))
        .expect(403);
      await http()
        .patch(`/api/v1/clientes/${clienteIds.ana}`)
        .set(auth(inventarioToken))
        .send({ telefono: '987654321' })
        .expect(403);
      await http()
        .delete(`/api/v1/clientes/${clienteIds.ana}`)
        .set(auth(inventarioToken))
        .expect(403);
    });

    it('el rol ventas puede listar', async () => {
      await http()
        .get('/api/v1/clientes')
        .query({ search: MARCA })
        .set(auth(ventasToken))
        .expect(200);
    });
  });

  describe('GET /clientes', () => {
    it('devuelve los datos de la persona y el correo de la cuenta', async () => {
      const res = await listar().expect(200);
      const { data, meta } = res.body as ListadoHttp;

      expect(meta.total).toBe(5);
      expect(data).toHaveLength(5);

      const ana = data.find((c) => c.numero_documento === ANA.dni);
      expect(ana).toMatchObject({
        id: clienteIds.ana,
        nombres: 'Ana',
        apellido_paterno: 'Torres',
        apellido_materno: MARCA,
        tipo_documento: 'dni',
        tipo_cliente: 'persona_natural',
        razon_social: null,
        categoria_cliente: 'minorista',
        estado: true,
        email: ANA.email,
      });
      expect(ana).not.toHaveProperty('contrasena');
      expect(ana).not.toHaveProperty('token_recuperacion');

      // Beto no tiene cuenta: el correo es null.
      expect(
        data.find((c) => c.numero_documento === BETO.dni)?.email,
      ).toBeNull();
      expect(
        data.find((c) => c.numero_documento === EMPRESA.ruc)?.razon_social,
      ).toBe(EMPRESA.razon_social);
    });

    it('ordena del más reciente al más antiguo', async () => {
      const { data } = (await listar().expect(200)).body as ListadoHttp;

      const fechas = data.map((c) => Date.parse(c.created_at));
      expect(fechas).toEqual([...fechas].sort((a, b) => b - a));
      expect(data[0].numero_documento).toBe(LUIS.dni);
    });

    it('busca por nombre y apellido, sin distinguir mayúsculas', async () => {
      const { data } = (await listar({ search: 'ANA torres' }).expect(200))
        .body as ListadoHttp;

      expect(data.map((c) => c.numero_documento)).toEqual([ANA.dni]);
    });

    it('busca por número de documento', async () => {
      const { data } = (await listar({ search: BETO.dni }).expect(200))
        .body as ListadoHttp;

      expect(data.map((c) => c.id)).toEqual([clienteIds.beto]);
    });

    it('busca por razón social', async () => {
      const { data } = (
        await listar({ search: `distribuidora ${MARCA}` }).expect(200)
      ).body as ListadoHttp;

      expect(data.map((c) => c.id)).toEqual([clienteIds.empresa]);
    });

    it('filtra por estado, tipo y categoría', async () => {
      const inactivos = (await listar({ estado: 'false' }).expect(200))
        .body as ListadoHttp;
      expect(inactivos.data.map((c) => c.id)).toEqual([clienteIds.inactivo]);

      const empresas = (await listar({ tipo_cliente: 'empresa' }).expect(200))
        .body as ListadoHttp;
      expect(empresas.data.map((c) => c.id)).toEqual([clienteIds.empresa]);

      const mayoristas = (
        await listar({ categoria_cliente: 'mayorista' }).expect(200)
      ).body as ListadoHttp;
      expect(mayoristas.meta.total).toBe(2);
    });

    it('pagina sin repetir ni omitir clientes', async () => {
      const ids: string[] = [];
      for (let page = 1; page <= 5; page++) {
        const res = (await listar({ limit: 1, page }).expect(200))
          .body as ListadoHttp;
        expect(res.meta).toMatchObject({
          total: 5,
          page,
          limit: 1,
          total_pages: 5,
        });
        ids.push(...res.data.map((c) => c.id));
      }

      expect(new Set(ids).size).toBe(5);
      const fuera = (await listar({ limit: 1, page: 6 }).expect(200))
        .body as ListadoHttp;
      expect(fuera.data).toEqual([]);
    });

    it('devuelve 400 con parámetros inválidos', async () => {
      await listar({ limit: 0 }).expect(400);
      await listar({ estado: 'quizas' }).expect(400);
      await listar({ tipo_cliente: 'otro' }).expect(400);
    });
  });

  describe('GET /clientes/:id', () => {
    it('devuelve el cliente con su persona y correo', async () => {
      const res = await http()
        .get(`/api/v1/clientes/${clienteIds.ana}`)
        .set(auth(adminToken))
        .expect(200);

      expect(res.body).toMatchObject({
        id: clienteIds.ana,
        nombres: 'Ana',
        numero_documento: ANA.dni,
        email: ANA.email,
      });
    });

    it('devuelve 404 si no existe y 400 si el id no es uuid', async () => {
      await http()
        .get(`/api/v1/clientes/${UUID_INEXISTENTE}`)
        .set(auth(adminToken))
        .expect(404);
      await http()
        .get('/api/v1/clientes/no-es-un-uuid')
        .set(auth(adminToken))
        .expect(400);
    });
  });

  describe('PATCH /clientes/:id', () => {
    it('edita datos de persona y de cliente y devuelve el formato ampliado', async () => {
      const res = await http()
        .patch(`/api/v1/clientes/${clienteIds.luis}`)
        .set(auth(adminToken))
        .send({
          telefono: '987654321',
          direccion: 'Jr. Lima 100',
          categoria_cliente: 'mayorista',
        })
        .expect(200);

      expect(res.body).toMatchObject({
        id: clienteIds.luis,
        nombres: 'Luis',
        telefono: '987654321',
        direccion: 'Jr. Lima 100',
        categoria_cliente: 'mayorista',
        email: null,
      });
    });

    it('devuelve 409 si el documento ya pertenece a otra persona', async () => {
      await http()
        .patch(`/api/v1/clientes/${clienteIds.luis}`)
        .set(auth(adminToken))
        .send({ tipo_documento: 'dni', numero_documento: ANA.dni })
        .expect(409);
    });

    it('devuelve 409 al pasar a empresa sin razón social', async () => {
      await http()
        .patch(`/api/v1/clientes/${clienteIds.luis}`)
        .set(auth(adminToken))
        .send({ tipo_cliente: 'empresa' })
        .expect(409);
    });

    it('pasa a empresa con razón social y vuelve a persona natural sin ella', async () => {
      const aEmpresa = await http()
        .patch(`/api/v1/clientes/${clienteIds.luis}`)
        .set(auth(adminToken))
        .send({ tipo_cliente: 'empresa', razon_social: `Luis SAC ${MARCA}` })
        .expect(200);
      expect(aEmpresa.body).toMatchObject({
        tipo_cliente: 'empresa',
        razon_social: `Luis SAC ${MARCA}`,
      });

      const aNatural = await http()
        .patch(`/api/v1/clientes/${clienteIds.luis}`)
        .set(auth(adminToken))
        .send({ tipo_cliente: 'persona_natural' })
        .expect(200);
      expect(aNatural.body).toMatchObject({
        tipo_cliente: 'persona_natural',
        razon_social: null,
      });
    });

    it('devuelve 400 con datos inválidos o campos desconocidos', async () => {
      const url = `/api/v1/clientes/${clienteIds.luis}`;
      await http()
        .patch(url)
        .set(auth(adminToken))
        .send({ telefono: '123' })
        .expect(400);
      await http()
        .patch(url)
        .set(auth(adminToken))
        .send({ campo_raro: 1 })
        .expect(400);
    });

    it('devuelve 404 si el cliente no existe', async () => {
      await http()
        .patch(`/api/v1/clientes/${UUID_INEXISTENTE}`)
        .set(auth(adminToken))
        .send({ telefono: '987654321' })
        .expect(404);
    });
  });

  describe('desactivar y reactivar', () => {
    it('DELETE desactiva de forma lógica y PATCH /activate reactiva', async () => {
      const desactivado = await http()
        .delete(`/api/v1/clientes/${clienteIds.luis}`)
        .set(auth(adminToken))
        .expect(200);
      expect(desactivado.body).toMatchObject({
        id: clienteIds.luis,
        estado: false,
        nombres: 'Luis',
      });

      // Sigue existiendo: solo cambió el estado.
      const consultado = await http()
        .get(`/api/v1/clientes/${clienteIds.luis}`)
        .set(auth(adminToken))
        .expect(200);
      expect((consultado.body as ClienteHttp).estado).toBe(false);

      const reactivado = await http()
        .patch(`/api/v1/clientes/${clienteIds.luis}/activate`)
        .set(auth(adminToken))
        .expect(200);
      expect((reactivado.body as ClienteHttp).estado).toBe(true);
    });

    it('devuelve 404 si el cliente no existe', async () => {
      await http()
        .delete(`/api/v1/clientes/${UUID_INEXISTENTE}`)
        .set(auth(adminToken))
        .expect(404);
      await http()
        .patch(`/api/v1/clientes/${UUID_INEXISTENTE}/activate`)
        .set(auth(adminToken))
        .expect(404);
    });
  });
});
