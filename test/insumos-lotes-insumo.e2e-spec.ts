import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

// HU-A gestionar insumos y lotes de insumo (OFT0-254 / OFT0-255). Los
// movimientos de inventario (kardex) quedan fuera a propósito: van en otra
// rama y otro PR.
const MARCA = 'E2E OFT0-255';
const INSUMOS_URL = '/api/v1/insumos';
const LOTES_URL = '/api/v1/lotes-insumo';

interface InsumoHttp {
  id: number;
  sku: string;
  nombre: string;
  stock_actual: string;
  estado: boolean;
}

interface LoteHttp {
  id: number;
  insumo_id: number;
  codigo_lote: string;
  fecha_vencimiento: string | null;
  cantidad_inicial: string;
  cantidad_actual: string;
  estado: string;
  activo: boolean;
}

// Un usuario por rol relevante. `inventario` tiene acceso completo (lectura y
// escritura), `produccion` solo lectura, `ventas` no tiene acceso alguno.
const TEST_USERS = {
  inventario: {
    identificador: 'e2e-inventario-oft255',
    password: 'InventarioE2e123',
    email: 'e2e-inventario-oft255@francos.test',
    documento: '99999990',
    rol: 'inventario',
  },
  produccion: {
    identificador: 'e2e-produccion-oft255',
    password: 'ProduccionE2e123',
    email: 'e2e-produccion-oft255@francos.test',
    documento: '99999991',
    rol: 'produccion',
  },
  ventas: {
    identificador: 'e2e-ventas-oft255',
    password: 'VentasE2e123',
    email: 'e2e-ventas-oft255@francos.test',
    documento: '99999992',
    rol: 'ventas',
  },
} as const;

describe('Insumos y lotes de insumo (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let inventarioToken: string;
  let produccionToken: string;
  let ventasToken: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const login = async (identificador: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador, password });
    expect([200, 201]).toContain(res.status);
    return (res.body as { access_token: string }).access_token;
  };

  const createTestUser = async (
    testUser: (typeof TEST_USERS)[keyof typeof TEST_USERS],
  ) => {
    const rol = await prisma.rol.findUniqueOrThrow({
      where: { nombre: testUser.rol },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Usuario',
        apellido_paterno: testUser.rol,
        apellido_materno: 'OFT0-255 E2E',
        tipo_documento: 'dni',
        numero_documento: testUser.documento,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: testUser.email,
        username: testUser.identificador,
        contrasena: await hashPassword(testUser.password),
        estado: true,
        email_verificado: true,
      },
    });
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: rol.id, estado: true },
    });
  };

  const deleteTestUsers = async () => {
    for (const testUser of Object.values(TEST_USERS)) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ username: testUser.identificador }, { email: testUser.email }],
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
          where: { numero_documento: testUser.documento },
        });
      }
    }
  };

  const limpiarDatos = async () => {
    const insumosDePrueba = await prisma.insumo.findMany({
      where: { nombre: { startsWith: MARCA } },
      select: { id: true },
    });

    await prisma.movimientoInsumo.deleteMany({
      where: { lote_insumo: { codigo_lote: { startsWith: MARCA } } },
    });
    // El contador de correlativo (insumo_id + fecha) no se borra solo con
    // el insumo: se limpia aparte para no dejar filas huérfanas entre corridas.
    await prisma.movimientoInsumoCorrelativo.deleteMany({
      where: { insumo_id: { in: insumosDePrueba.map((i) => i.id) } },
    });
    await prisma.loteInsumo.deleteMany({
      where: { codigo_lote: { startsWith: MARCA } },
    });
    await prisma.insumo.deleteMany({
      where: { nombre: { startsWith: MARCA } },
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

    await limpiarDatos();
    await deleteTestUsers();
    for (const testUser of Object.values(TEST_USERS)) {
      await createTestUser(testUser);
    }

    adminToken = await login('admin', 'admin123');
    inventarioToken = await login(
      TEST_USERS.inventario.identificador,
      TEST_USERS.inventario.password,
    );
    produccionToken = await login(
      TEST_USERS.produccion.identificador,
      TEST_USERS.produccion.password,
    );
    ventasToken = await login(
      TEST_USERS.ventas.identificador,
      TEST_USERS.ventas.password,
    );
  });

  afterAll(async () => {
    await limpiarDatos();
    await deleteTestUsers();
    await app.close();
  });

  describe('Insumos', () => {
    it('crea un insumo activo con stock_actual en 0 (admin)', async () => {
      const res = await request(app.getHttpServer())
        .post(INSUMOS_URL)
        .set(auth(adminToken))
        .send({
          nombre: `${MARCA} Harina`,
          unidad_medida: 'kg',
          stock_minimo: 10,
          stock_maximo: 500,
          tipo: 'materia_prima',
        })
        .expect(201);

      const body = res.body as InsumoHttp;
      expect(body.sku).toBeTruthy();
      expect(Number(body.stock_actual)).toBe(0);
      expect(body.estado).toBe(true);
    });

    it('rechaza stock_actual en el body de creación (400)', async () => {
      await request(app.getHttpServer())
        .post(INSUMOS_URL)
        .set(auth(adminToken))
        .send({
          nombre: `${MARCA} Azúcar`,
          unidad_medida: 'kg',
          stock_minimo: 10,
          stock_maximo: 500,
          stock_actual: 50,
          tipo: 'materia_prima',
        })
        .expect(400);
    });

    it('rechaza stock_maximo menor que stock_minimo (409)', async () => {
      await request(app.getHttpServer())
        .post(INSUMOS_URL)
        .set(auth(adminToken))
        .send({
          nombre: `${MARCA} Sal`,
          unidad_medida: 'kg',
          stock_minimo: 100,
          stock_maximo: 10,
          tipo: 'materia_prima',
        })
        .expect(409);
    });

    it('GET sin token devuelve 401', async () => {
      await request(app.getHttpServer()).get(INSUMOS_URL).expect(401);
    });

    it('GET con rol ventas (sin acceso) devuelve 403', async () => {
      await request(app.getHttpServer())
        .get(INSUMOS_URL)
        .set(auth(ventasToken))
        .expect(403);
    });

    it('GET con rol produccion (solo lectura) devuelve 200', async () => {
      await request(app.getHttpServer())
        .get(INSUMOS_URL)
        .query({ search: MARCA, limit: 100 })
        .set(auth(produccionToken))
        .expect(200);
    });

    it('POST con rol produccion (sin escritura) devuelve 403', async () => {
      await request(app.getHttpServer())
        .post(INSUMOS_URL)
        .set(auth(produccionToken))
        .send({
          nombre: `${MARCA} No debería crearse`,
          unidad_medida: 'kg',
          stock_minimo: 1,
          stock_maximo: 10,
          tipo: 'materia_prima',
        })
        .expect(403);
    });

    it('POST con rol inventario devuelve 201', async () => {
      await request(app.getHttpServer())
        .post(INSUMOS_URL)
        .set(auth(inventarioToken))
        .send({
          nombre: `${MARCA} Manteca`,
          unidad_medida: 'kg',
          stock_minimo: 5,
          stock_maximo: 200,
          tipo: 'materia_prima',
        })
        .expect(201);
    });

    it('actualiza y desactiva/reactiva un insumo (admin)', async () => {
      const creado = (
        await request(app.getHttpServer())
          .post(INSUMOS_URL)
          .set(auth(adminToken))
          .send({
            nombre: `${MARCA} Levadura`,
            unidad_medida: 'kg',
            stock_minimo: 1,
            stock_maximo: 50,
            tipo: 'materia_prima',
          })
          .expect(201)
      ).body as InsumoHttp;

      const editado = await request(app.getHttpServer())
        .patch(`${INSUMOS_URL}/${creado.id}`)
        .set(auth(adminToken))
        .send({ stock_minimo: 2 })
        .expect(200);
      expect(
        Number(
          (editado.body as InsumoHttp & { stock_minimo: string }).stock_minimo,
        ),
      ).toBe(2);

      const desactivado = await request(app.getHttpServer())
        .delete(`${INSUMOS_URL}/${creado.id}`)
        .set(auth(adminToken))
        .expect(200);
      expect((desactivado.body as InsumoHttp).estado).toBe(false);

      const reactivado = await request(app.getHttpServer())
        .patch(`${INSUMOS_URL}/${creado.id}/activate`)
        .set(auth(adminToken))
        .expect(200);
      expect((reactivado.body as InsumoHttp).estado).toBe(true);
    });

    it('devuelve 404 si el insumo no existe', async () => {
      await request(app.getHttpServer())
        .get(`${INSUMOS_URL}/999999`)
        .set(auth(adminToken))
        .expect(404);
    });

    it('filtra por nivel de stock (mismo criterio que /indicadores)', async () => {
      // Recién creado, stock_actual queda en 0 => nivel "agotado".
      const creado = (
        await request(app.getHttpServer())
          .post(INSUMOS_URL)
          .set(auth(adminToken))
          .send({
            nombre: `${MARCA} Nivel Agotado`,
            unidad_medida: 'kg',
            stock_minimo: 10,
            stock_maximo: 500,
            tipo: 'materia_prima',
          })
          .expect(201)
      ).body as InsumoHttp;

      const agotados = await request(app.getHttpServer())
        .get(INSUMOS_URL)
        .query({ search: MARCA, nivel: 'agotado', limit: 100 })
        .set(auth(adminToken))
        .expect(200);
      expect(
        (agotados.body.data as InsumoHttp[]).some((i) => i.id === creado.id),
      ).toBe(true);

      const normales = await request(app.getHttpServer())
        .get(INSUMOS_URL)
        .query({ search: MARCA, nivel: 'normal', limit: 100 })
        .set(auth(adminToken))
        .expect(200);
      expect(
        (normales.body.data as InsumoHttp[]).some((i) => i.id === creado.id),
      ).toBe(false);
    });

    it('rechaza un nivel inválido (400)', async () => {
      await request(app.getHttpServer())
        .get(INSUMOS_URL)
        .query({ nivel: 'inexistente' })
        .set(auth(adminToken))
        .expect(400);
    });
  });

  describe('Lotes de insumo', () => {
    let insumoId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(INSUMOS_URL)
        .set(auth(adminToken))
        .send({
          nombre: `${MARCA} Insumo para lotes`,
          unidad_medida: 'kg',
          stock_minimo: 10,
          stock_maximo: 1000,
          tipo: 'materia_prima',
        })
        .expect(201);
      insumoId = (res.body as InsumoHttp).id;
    });

    it('crea un lote con cantidad_actual igual a cantidad_inicial (sin movimientos todavía)', async () => {
      const res = await request(app.getHttpServer())
        .post(LOTES_URL)
        .set(auth(adminToken))
        .send({
          insumo_id: insumoId,
          codigo_lote: `${MARCA}-001`,
          fecha_ingreso: '2026-10-01',
          fecha_vencimiento: '2027-04-01',
          cantidad_inicial: 100,
        })
        .expect(201);

      const body = res.body as LoteHttp;
      expect(Number(body.cantidad_inicial)).toBe(100);
      expect(Number(body.cantidad_actual)).toBe(100);
      expect(body.estado).toBe('activo');

      const insumoActualizado = (
        await request(app.getHttpServer())
          .get(`${INSUMOS_URL}/${insumoId}`)
          .set(auth(adminToken))
          .expect(200)
      ).body as InsumoHttp;
      expect(Number(insumoActualizado.stock_actual)).toBe(100);
    });

    it('rechaza un código de lote duplicado (409)', async () => {
      await request(app.getHttpServer())
        .post(LOTES_URL)
        .set(auth(adminToken))
        .send({
          insumo_id: insumoId,
          codigo_lote: `${MARCA}-001`,
          fecha_ingreso: '2026-10-01',
          cantidad_inicial: 10,
        })
        .expect(409);
    });

    it('rechaza un insumo inexistente (404)', async () => {
      await request(app.getHttpServer())
        .post(LOTES_URL)
        .set(auth(adminToken))
        .send({
          insumo_id: 999999,
          codigo_lote: `${MARCA}-002`,
          fecha_ingreso: '2026-10-01',
          cantidad_inicial: 10,
        })
        .expect(404);
    });

    it('rechaza fecha_vencimiento anterior a fecha_ingreso (409)', async () => {
      await request(app.getHttpServer())
        .post(LOTES_URL)
        .set(auth(adminToken))
        .send({
          insumo_id: insumoId,
          codigo_lote: `${MARCA}-003`,
          fecha_ingreso: '2026-10-17',
          fecha_vencimiento: '2026-10-01',
          cantidad_inicial: 10,
        })
        .expect(409);
    });

    it('ordena el listado por fecha de vencimiento más próxima primero (sin fecha al final)', async () => {
      await request(app.getHttpServer())
        .post(LOTES_URL)
        .set(auth(adminToken))
        .send({
          insumo_id: insumoId,
          codigo_lote: `${MARCA}-004-lejano`,
          fecha_ingreso: '2026-10-01',
          fecha_vencimiento: '2028-01-01',
          cantidad_inicial: 10,
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(LOTES_URL)
        .set(auth(adminToken))
        .send({
          insumo_id: insumoId,
          codigo_lote: `${MARCA}-005-cercano`,
          fecha_ingreso: '2026-10-01',
          fecha_vencimiento: '2026-11-01',
          cantidad_inicial: 10,
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(LOTES_URL)
        .set(auth(adminToken))
        .send({
          insumo_id: insumoId,
          codigo_lote: `${MARCA}-006-sin-vencimiento`,
          fecha_ingreso: '2026-10-01',
          cantidad_inicial: 10,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(LOTES_URL)
        .query({ insumo_id: insumoId, limit: 100 })
        .set(auth(adminToken))
        .expect(200);

      const codigos = (res.body as { data: LoteHttp[] }).data.map(
        (l) => l.codigo_lote,
      );
      expect(codigos).toEqual([
        `${MARCA}-005-cercano`,
        `${MARCA}-001`,
        `${MARCA}-004-lejano`,
        `${MARCA}-006-sin-vencimiento`,
      ]);
    });

    it('GET sin token devuelve 401 y con rol ventas devuelve 403', async () => {
      await request(app.getHttpServer()).get(LOTES_URL).expect(401);
      await request(app.getHttpServer())
        .get(LOTES_URL)
        .set(auth(ventasToken))
        .expect(403);
    });

    it('POST con rol produccion devuelve 403 y con rol inventario devuelve 201', async () => {
      await request(app.getHttpServer())
        .post(LOTES_URL)
        .set(auth(produccionToken))
        .send({
          insumo_id: insumoId,
          codigo_lote: `${MARCA}-007-produccion`,
          fecha_ingreso: '2026-10-01',
          cantidad_inicial: 10,
        })
        .expect(403);

      await request(app.getHttpServer())
        .post(LOTES_URL)
        .set(auth(inventarioToken))
        .send({
          insumo_id: insumoId,
          codigo_lote: `${MARCA}-007-inventario`,
          fecha_ingreso: '2026-10-01',
          cantidad_inicial: 10,
        })
        .expect(201);
    });

    it('da de baja y reactiva un lote de forma lógica', async () => {
      const creado = (
        await request(app.getHttpServer())
          .post(LOTES_URL)
          .set(auth(adminToken))
          .send({
            insumo_id: insumoId,
            codigo_lote: `${MARCA}-008-baja`,
            fecha_ingreso: '2026-10-01',
            cantidad_inicial: 10,
          })
          .expect(201)
      ).body as LoteHttp;

      const desactivado = await request(app.getHttpServer())
        .delete(`${LOTES_URL}/${creado.id}`)
        .set(auth(adminToken))
        .expect(200);
      expect((desactivado.body as LoteHttp).activo).toBe(false);

      const reactivado = await request(app.getHttpServer())
        .patch(`${LOTES_URL}/${creado.id}/activate`)
        .set(auth(adminToken))
        .expect(200);
      expect((reactivado.body as LoteHttp).activo).toBe(true);
    });

    it('devuelve 404 si el lote no existe', async () => {
      await request(app.getHttpServer())
        .get(`${LOTES_URL}/999999`)
        .set(auth(adminToken))
        .expect(404);
    });
  });
});
