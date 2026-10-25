import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

// HU gestionar movimientos de insumo / kardex (OFT-256). Entrada (manual
// sobre lote existente), salida (reparto FEFO entre lotes) y ajuste
// (cantidad firmada). El kardex es solo Create + Read a propósito.
const MARCA = 'E2E OFT256';
const INSUMOS_URL = '/api/v1/insumos';
const LOTES_URL = '/api/v1/lotes-insumo';
const MOVIMIENTOS_URL = '/api/v1/movimientos-insumo';

interface InsumoHttp {
  id: number;
  stock_actual: string;
}

interface LoteHttp {
  id: number;
  cantidad_actual: string;
  estado: string;
}

interface MovimientoHttp {
  id: number;
  lote_insumo_id: number;
  tipo: string;
  cantidad: string;
  stock_anterior: string;
  stock_resultante: string;
}

const TEST_USERS = {
  inventario: {
    identificador: 'e2e-inventario-oft256',
    password: 'InventarioE2e123',
    email: 'e2e-inventario-oft256@francos.test',
    documento: '99999980',
    rol: 'inventario',
  },
  ventas: {
    identificador: 'e2e-ventas-oft256',
    password: 'VentasE2e123',
    email: 'e2e-ventas-oft256@francos.test',
    documento: '99999981',
    rol: 'ventas',
  },
} as const;

describe('Movimientos de insumo (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let inventarioToken: string;
  let ventasToken: string;
  let insumoId: number;
  let loteCercanoId: number;
  let loteLejanoId: number;

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
        apellido_materno: 'OFT-256 E2E',
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
    ventasToken = await login(
      TEST_USERS.ventas.identificador,
      TEST_USERS.ventas.password,
    );

    const insumo = (
      await request(app.getHttpServer())
        .post(INSUMOS_URL)
        .set(auth(adminToken))
        .send({
          nombre: `${MARCA} Harina`,
          unidad_medida: 'kg',
          stock_minimo: 10,
          stock_maximo: 1000,
          tipo: 'materia_prima',
        })
        .expect(201)
    ).body as InsumoHttp;
    insumoId = insumo.id;

    const loteCercano = (
      await request(app.getHttpServer())
        .post(LOTES_URL)
        .set(auth(adminToken))
        .send({
          insumo_id: insumoId,
          codigo_lote: `${MARCA}-cercano`,
          fecha_ingreso: '2026-10-01',
          fecha_vencimiento: '2026-11-01',
          cantidad_inicial: 60,
        })
        .expect(201)
    ).body as LoteHttp;
    loteCercanoId = loteCercano.id;

    const loteLejano = (
      await request(app.getHttpServer())
        .post(LOTES_URL)
        .set(auth(adminToken))
        .send({
          insumo_id: insumoId,
          codigo_lote: `${MARCA}-lejano`,
          fecha_ingreso: '2026-10-01',
          fecha_vencimiento: '2027-06-01',
          cantidad_inicial: 50,
        })
        .expect(201)
    ).body as LoteHttp;
    loteLejanoId = loteLejano.id;
  });

  afterAll(async () => {
    await limpiarDatos();
    await deleteTestUsers();
    await app.close();
  });

  it('GET sin token devuelve 401 y con rol ventas devuelve 403', async () => {
    await request(app.getHttpServer()).get(MOVIMIENTOS_URL).expect(401);
    await request(app.getHttpServer())
      .get(MOVIMIENTOS_URL)
      .set(auth(ventasToken))
      .expect(403);
  });

  it('POST entrada con rol ventas devuelve 403 y suma al lote existente (201) con rol inventario', async () => {
    await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/entrada`)
      .set(auth(ventasToken))
      .send({
        lote_insumo_id: loteCercanoId,
        cantidad: 15,
        razon: `${MARCA}: no debería aplicarse`,
      })
      .expect(403);

    const res = await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/entrada`)
      .set(auth(inventarioToken))
      .send({
        lote_insumo_id: loteCercanoId,
        cantidad: 15,
        razon: `${MARCA}: segunda entrega del mismo lote`,
      })
      .expect(201);

    const body = res.body as MovimientoHttp;
    expect(body.tipo).toBe('entrada');
    expect(Number(body.stock_anterior)).toBe(60);
    expect(Number(body.stock_resultante)).toBe(75);
  });

  it('entrada sobre un lote inexistente devuelve 404', async () => {
    await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/entrada`)
      .set(auth(adminToken))
      .send({ lote_insumo_id: 999999, cantidad: 10, razon: MARCA })
      .expect(404);
  });

  it('salida reparte FEFO entre lotes (el que vence antes se agota primero) y marca el lote en 0 como agotado', async () => {
    const res = await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/salida`)
      .set(auth(inventarioToken))
      .send({
        insumo_id: insumoId,
        cantidad: 90,
        razon: `${MARCA}: salida FEFO`,
      })
      .expect(201);

    const movimientos = res.body as MovimientoHttp[];
    expect(movimientos).toHaveLength(2);
    expect(movimientos[0].lote_insumo_id).toBe(loteCercanoId);
    expect(Number(movimientos[0].cantidad)).toBe(75);
    expect(Number(movimientos[0].stock_resultante)).toBe(0);
    expect(movimientos[1].lote_insumo_id).toBe(loteLejanoId);
    expect(Number(movimientos[1].cantidad)).toBe(15);
    expect(Number(movimientos[1].stock_resultante)).toBe(35);

    const loteAgotado = (
      await request(app.getHttpServer())
        .get(`${LOTES_URL}/${loteCercanoId}`)
        .set(auth(adminToken))
        .expect(200)
    ).body as LoteHttp;
    expect(loteAgotado.estado).toBe('agotado');

    const insumoActualizado = (
      await request(app.getHttpServer())
        .get(`${INSUMOS_URL}/${insumoId}`)
        .set(auth(adminToken))
        .expect(200)
    ).body as InsumoHttp;
    expect(Number(insumoActualizado.stock_actual)).toBe(35);
  });

  it('salida sin stock suficiente devuelve 409 y no crea ningún movimiento', async () => {
    const antes = await request(app.getHttpServer())
      .get(MOVIMIENTOS_URL)
      .query({ insumo_id: insumoId, limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    const totalAntes = (antes.body as { meta: { total: number } }).meta.total;

    await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/salida`)
      .set(auth(adminToken))
      .send({
        insumo_id: insumoId,
        cantidad: 9999,
        razon: `${MARCA}: no debería aplicarse`,
      })
      .expect(409);

    const despues = await request(app.getHttpServer())
      .get(MOVIMIENTOS_URL)
      .query({ insumo_id: insumoId, limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    expect((despues.body as { meta: { total: number } }).meta.total).toBe(
      totalAntes,
    );
  });

  it('ajuste con cantidad negativa corrige el lote hacia abajo', async () => {
    const res = await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/ajuste`)
      .set(auth(inventarioToken))
      .send({
        lote_insumo_id: loteLejanoId,
        cantidad: -5,
        razon: `${MARCA}: merma detectada en conteo`,
      })
      .expect(201);

    const body = res.body as MovimientoHttp;
    expect(body.tipo).toBe('ajuste');
    expect(Number(body.stock_anterior)).toBe(35);
    expect(Number(body.stock_resultante)).toBe(30);
  });

  it('ajuste con cantidad 0 devuelve 409', async () => {
    await request(app.getHttpServer())
      .post(`${MOVIMIENTOS_URL}/ajuste`)
      .set(auth(adminToken))
      .send({
        lote_insumo_id: loteLejanoId,
        cantidad: 0,
        razon: `${MARCA}: no debería aplicarse`,
      })
      .expect(409);
  });

  it('GET :id devuelve el movimiento y 404 si no existe', async () => {
    const lista = await request(app.getHttpServer())
      .get(MOVIMIENTOS_URL)
      .query({ insumo_id: insumoId, limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    const primero = (lista.body as { data: MovimientoHttp[] }).data[0];

    await request(app.getHttpServer())
      .get(`${MOVIMIENTOS_URL}/${primero.id}`)
      .set(auth(adminToken))
      .expect(200);

    await request(app.getHttpServer())
      .get(`${MOVIMIENTOS_URL}/999999`)
      .set(auth(adminToken))
      .expect(404);
  });

  it('filtra por search (nombre o sku del insumo, vía lote_insumo.insumo)', async () => {
    const porNombre = await request(app.getHttpServer())
      .get(MOVIMIENTOS_URL)
      .query({ search: 'Harina', limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    const dataPorNombre = (porNombre.body as { data: MovimientoHttp[] }).data;
    expect(dataPorNombre.length).toBeGreaterThan(0);
    expect(dataPorNombre.every((m) => m.lote_insumo_id !== undefined)).toBe(
      true,
    );

    const sinMatch = await request(app.getHttpServer())
      .get(MOVIMIENTOS_URL)
      .query({ search: 'Ingrediente que no existe', limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    expect((sinMatch.body as { data: MovimientoHttp[] }).data).toHaveLength(0);
  });

  // Batch: varias filas en un mismo POST, en una sola transacción (OFT-256,
  // pedido por el front para el form de "Registrar movimiento" con varias
  // líneas). Usan su propio insumo/lotes para no depender del estado
  // acumulado de los tests anteriores.
  describe('Batch (array de filas)', () => {
    let insumoBatchId: number;
    let loteBatchAId: number;
    let loteBatchBId: number;

    beforeAll(async () => {
      const insumo = (
        await request(app.getHttpServer())
          .post(INSUMOS_URL)
          .set(auth(adminToken))
          .send({
            nombre: `${MARCA} Batch`,
            unidad_medida: 'kg',
            stock_minimo: 10,
            stock_maximo: 1000,
            tipo: 'materia_prima',
          })
          .expect(201)
      ).body as InsumoHttp;
      insumoBatchId = insumo.id;

      const loteA = (
        await request(app.getHttpServer())
          .post(LOTES_URL)
          .set(auth(adminToken))
          .send({
            insumo_id: insumoBatchId,
            codigo_lote: `${MARCA}-batch-a`,
            fecha_ingreso: '2026-10-01',
            fecha_vencimiento: '2026-11-01',
            cantidad_inicial: 40,
          })
          .expect(201)
      ).body as LoteHttp;
      loteBatchAId = loteA.id;

      const loteB = (
        await request(app.getHttpServer())
          .post(LOTES_URL)
          .set(auth(adminToken))
          .send({
            insumo_id: insumoBatchId,
            codigo_lote: `${MARCA}-batch-b`,
            fecha_ingreso: '2026-10-01',
            fecha_vencimiento: '2027-06-01',
            cantidad_inicial: 40,
          })
          .expect(201)
      ).body as LoteHttp;
      loteBatchBId = loteB.id;
    });

    it('entrada con array crea una fila por lote en una sola transacción', async () => {
      const res = await request(app.getHttpServer())
        .post(`${MOVIMIENTOS_URL}/entrada`)
        .set(auth(inventarioToken))
        .send([
          {
            lote_insumo_id: loteBatchAId,
            cantidad: 10,
            razon: `${MARCA}: fila 1`,
          },
          {
            lote_insumo_id: loteBatchBId,
            cantidad: 15,
            razon: `${MARCA}: fila 2`,
          },
        ])
        .expect(201);

      const movimientos = res.body as MovimientoHttp[];
      expect(movimientos).toHaveLength(2);
      expect(movimientos[0].lote_insumo_id).toBe(loteBatchAId);
      expect(Number(movimientos[0].stock_resultante)).toBe(50);
      expect(movimientos[1].lote_insumo_id).toBe(loteBatchBId);
      expect(Number(movimientos[1].stock_resultante)).toBe(55);
    });

    it('entrada con array no crea nada si una fila es inválida (todo o nada)', async () => {
      await request(app.getHttpServer())
        .post(`${MOVIMIENTOS_URL}/entrada`)
        .set(auth(inventarioToken))
        .send([
          {
            lote_insumo_id: loteBatchAId,
            cantidad: 5,
            razon: `${MARCA}: no debería aplicarse`,
          },
          {
            lote_insumo_id: 999999,
            cantidad: 5,
            razon: `${MARCA}: lote inexistente`,
          },
        ])
        .expect(404);

      const lote = (
        await request(app.getHttpServer())
          .get(`${LOTES_URL}/${loteBatchAId}`)
          .set(auth(adminToken))
          .expect(200)
      ).body as LoteHttp;
      // Sigue en 50 (de la fila anterior): la fila válida del batch fallido
      // no se guardó.
      expect(Number(lote.cantidad_actual)).toBe(50);
    });

    it('array vacío devuelve 400', async () => {
      await request(app.getHttpServer())
        .post(`${MOVIMIENTOS_URL}/entrada`)
        .set(auth(inventarioToken))
        .send([])
        .expect(400);
    });

    it('ajuste con array aplica varias filas sobre lotes distintos', async () => {
      const res = await request(app.getHttpServer())
        .post(`${MOVIMIENTOS_URL}/ajuste`)
        .set(auth(inventarioToken))
        .send([
          {
            lote_insumo_id: loteBatchAId,
            cantidad: -10,
            razon: `${MARCA}: merma A`,
          },
          {
            lote_insumo_id: loteBatchBId,
            cantidad: 5,
            razon: `${MARCA}: conteo B`,
          },
        ])
        .expect(201);

      const movimientos = res.body as MovimientoHttp[];
      expect(movimientos).toHaveLength(2);
      expect(Number(movimientos[0].stock_resultante)).toBe(40);
      expect(Number(movimientos[1].stock_resultante)).toBe(60);
    });

    it('salida con array junta varias filas del mismo insumo sin pisarse el saldo', async () => {
      // Tras el batch anterior: loteBatchA=40, loteBatchB=60. FEFO toma
      // primero loteBatchA (vence antes).
      const res = await request(app.getHttpServer())
        .post(`${MOVIMIENTOS_URL}/salida`)
        .set(auth(inventarioToken))
        .send([
          { insumo_id: insumoBatchId, cantidad: 30, razon: `${MARCA}: fila 1` },
          { insumo_id: insumoBatchId, cantidad: 20, razon: `${MARCA}: fila 2` },
        ])
        .expect(201);

      const movimientos = res.body as MovimientoHttp[];
      // Fila 1 (30) sale completa de loteBatchA (quedan 10). Fila 2 (20) toma
      // los 10 que quedan de loteBatchA y 10 de loteBatchB.
      expect(movimientos).toHaveLength(3);
      expect(movimientos[0].lote_insumo_id).toBe(loteBatchAId);
      expect(Number(movimientos[0].cantidad)).toBe(30);
      expect(movimientos[1].lote_insumo_id).toBe(loteBatchAId);
      expect(Number(movimientos[1].cantidad)).toBe(10);
      expect(movimientos[2].lote_insumo_id).toBe(loteBatchBId);
      expect(Number(movimientos[2].cantidad)).toBe(10);

      const insumoActualizado = (
        await request(app.getHttpServer())
          .get(`${INSUMOS_URL}/${insumoBatchId}`)
          .set(auth(adminToken))
          .expect(200)
      ).body as InsumoHttp;
      expect(Number(insumoActualizado.stock_actual)).toBe(50);
    });
  });
});
