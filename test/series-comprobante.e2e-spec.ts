import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { ReservarCorrelativoUseCase } from '../src/modules/sales/application/use-cases/series-comprobante/reservar-correlativo.use-case';
import { TipoComprobante } from '../src/modules/sales/domain/enums/sales.enums';
import {
  CorrelativoNoDisponibleError,
  ResourceConflictError,
} from '../src/modules/sales/domain/errors/sales-domain.errors';
import { SerieComprobanteRepository } from '../src/modules/sales/domain/repositories/serie-comprobante.repository';

// Datos exclusivos de esta suite (prefijo e2e-493, DNI 9999493x, series *Z9*).
const ADMIN = { identificador: 'admin', password: 'admin123' };
const PASSWORD = 'VentasE2e123';
const VENTAS = {
  username: 'e2e-493-ventas',
  email: 'e2e-493-ventas@francos.test',
  dni: '99994931',
};
const CLIENTE = {
  username: 'e2e-493-cliente',
  email: 'e2e-493-cliente@francos.test',
  dni: '99994932',
};
const DNIS = [VENTAS.dni, CLIENTE.dni];
const CODIGOS = ['BZ91', 'BZ92', 'BZ93', 'FZ91', 'FZ92'];
const BASE = '/api/v1/series-comprobante';
const ID_INEXISTENTE = 2147483647;

interface SerieHttp {
  id: number;
  tipo: string;
  serie: string;
  correlativo_inicio: number;
  correlativo_fin: number;
  correlativo_actual: number | null;
  siguiente: number | null;
  restantes: number;
  umbral_alerta: number;
  por_agotar: boolean;
  estado: boolean;
}
interface ListadoHttp {
  data: SerieHttp[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

describe('Series de comprobante (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let reservar: ReservarCorrelativoUseCase;
  let repository: SerieComprobanteRepository;
  let adminToken: string;
  let ventasToken: string;
  let clienteToken: string;
  let adminUserId: string;
  let existingAdminRefreshTokenIds: string[];
  // Series activas ajenas a la suite: se desactivan durante la prueba (solo
  // puede haber una activa por tipo) y se reactivan al final.
  let activasPrevias: number[] = [];
  const ids: Record<string, number> = {};

  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const login = async (identificador: string, password: string) => {
    const response = await http()
      .post('/api/v1/auth/login')
      .send({ identificador, password })
      .expect(201);
    return (response.body as { access_token: string }).access_token;
  };

  const motivoDe = async (tipo: TipoComprobante) => {
    const error = await reservar.execute(tipo).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CorrelativoNoDisponibleError);
    return (error as CorrelativoNoDisponibleError).motivo;
  };

  const deleteSuiteData = async () => {
    await prisma.serieComprobante.deleteMany({
      where: { serie: { in: CODIGOS } },
    });
    const users = await prisma.user.findMany({
      where: { persona: { numero_documento: { in: DNIS } } },
      select: { id: true },
    });
    const userIds = users.map(({ id }) => id);
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { user_id: { in: userIds } } }),
      prisma.usuarioRol.deleteMany({ where: { user_id: { in: userIds } } }),
      prisma.user.deleteMany({ where: { id: { in: userIds } } }),
      prisma.persona.deleteMany({ where: { numero_documento: { in: DNIS } } }),
    ]);
  };

  const createDirectUser = async (
    data: { username: string; email: string; dni: string },
    rol: string,
  ) => {
    const rolId = (
      await prisma.rol.findUniqueOrThrow({ where: { nombre: rol } })
    ).id;
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Usuario',
        apellido_paterno: 'Suite',
        apellido_materno: 'E2E493',
        tipo_documento: 'dni',
        numero_documento: data.dni,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: data.email,
        username: data.username,
        contrasena: await hashPassword(PASSWORD),
        estado: true,
        email_verificado: true,
      },
    });
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: rolId, estado: true },
    });
  };

  const crear = (body: Record<string, unknown>) =>
    http().post(BASE).set(auth(adminToken)).send(body);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    reservar = app.get(ReservarCorrelativoUseCase);
    repository = app.get(SerieComprobanteRepository);

    await deleteSuiteData();

    activasPrevias = (
      await prisma.serieComprobante.findMany({
        where: { estado: true },
        select: { id: true },
      })
    ).map(({ id }) => id);
    await prisma.serieComprobante.updateMany({
      where: { id: { in: activasPrevias } },
      data: { estado: false },
    });

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

    await createDirectUser(VENTAS, 'ventas');
    await createDirectUser(CLIENTE, 'cliente');

    adminToken = await login(ADMIN.identificador, ADMIN.password);
    ventasToken = await login(VENTAS.username, PASSWORD);
    clienteToken = await login(CLIENTE.username, PASSWORD);
  }, 30_000);

  afterAll(async () => {
    await deleteSuiteData();
    await prisma.serieComprobante.updateMany({
      where: { id: { in: activasPrevias } },
      data: { estado: true },
    });
    await prisma.refreshToken.deleteMany({
      where: {
        user_id: adminUserId,
        id: { notIn: existingAdminRefreshTokenIds },
      },
    });
    await app.close();
  }, 30_000);

  describe('autorización', () => {
    it('sin token responde 401', async () => {
      await http().get(BASE).expect(401);
      await http().get(`${BASE}/alertas`).expect(401);
    });

    it.each(['ventas', 'cliente'])('con rol %s responde 403', async (rol) => {
      const token = rol === 'ventas' ? ventasToken : clienteToken;
      await http().get(BASE).set(auth(token)).expect(403);
      await http().get(`${BASE}/alertas`).set(auth(token)).expect(403);
      await http()
        .post(BASE)
        .set(auth(token))
        .send({
          tipo: 'boleta',
          serie: 'BZ91',
          correlativo_inicio: 1,
          correlativo_fin: 5,
        })
        .expect(403);
      expect(
        await prisma.serieComprobante.count({ where: { serie: 'BZ91' } }),
      ).toBe(0);
    });
  });

  describe('crear y consultar', () => {
    it('POST crea la serie activa y sin emitir', async () => {
      const response = await crear({
        tipo: 'boleta',
        serie: 'BZ91',
        correlativo_inicio: 1,
        correlativo_fin: 5,
        umbral_alerta: 2,
      }).expect(201);

      const body = response.body as SerieHttp;
      ids.BZ91 = body.id;
      expect(body).toMatchObject({
        tipo: 'boleta',
        serie: 'BZ91',
        correlativo_inicio: 1,
        correlativo_fin: 5,
        correlativo_actual: null,
        siguiente: 1,
        restantes: 5,
        umbral_alerta: 2,
        por_agotar: false,
        estado: true,
      });

      const fila = await prisma.serieComprobante.findUniqueOrThrow({
        where: { id: body.id },
      });
      expect(fila.correlativo_actual).toBe(0);
    });

    it('el umbral por defecto es 100', async () => {
      const response = await crear({
        tipo: 'factura',
        serie: 'FZ91',
        correlativo_inicio: 100,
        correlativo_fin: 1000,
      }).expect(201);
      const body = response.body as SerieHttp;
      ids.FZ91 = body.id;
      expect(body).toMatchObject({ umbral_alerta: 100, siguiente: 100 });
    });

    it.each([
      ['prefijo que no corresponde al tipo', { tipo: 'boleta', serie: 'FZ99' }],
      ['código fuera del formato SUNAT', { serie: 'bz99' }],
      ['código de 5 caracteres', { serie: 'BZ999' }],
      [
        'inicio mayor que el fin',
        { correlativo_inicio: 9, correlativo_fin: 8 },
      ],
      ['inicio 0', { correlativo_inicio: 0 }],
      ['fin de 9 dígitos', { correlativo_fin: 100000000 }],
      ['tipo desconocido', { tipo: 'nota_credito' }],
    ])('400 por %s', async (_caso, overrides) => {
      await crear({
        tipo: 'boleta',
        serie: 'BZ99',
        correlativo_inicio: 1,
        correlativo_fin: 10,
        ...overrides,
      }).expect(400);
    });

    it('409 por código duplicado', async () => {
      await crear({
        tipo: 'boleta',
        serie: 'BZ91',
        correlativo_inicio: 1,
        correlativo_fin: 10,
        estado: false,
      }).expect(409);
    });

    it('409 por segunda serie activa del mismo tipo; inactiva sí se crea', async () => {
      await crear({
        tipo: 'boleta',
        serie: 'BZ92',
        correlativo_inicio: 1,
        correlativo_fin: 10,
      }).expect(409);

      const response = await crear({
        tipo: 'boleta',
        serie: 'BZ92',
        correlativo_inicio: 1,
        correlativo_fin: 10,
        estado: false,
      }).expect(201);
      ids.BZ92 = (response.body as SerieHttp).id;
    });

    it('la BD rechaza una segunda activa por tipo aunque se salte el caso de uso', async () => {
      await expect(
        prisma.serieComprobante.create({
          data: {
            tipo: 'boleta',
            serie: 'BZ93',
            correlativo_inicio: 1,
            correlativo_fin: 10,
            correlativo_actual: 0,
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });

    it('la BD rechaza un rango inválido (CHECK)', async () => {
      await expect(
        prisma.serieComprobante.create({
          data: {
            tipo: 'boleta',
            serie: 'BZ93',
            correlativo_inicio: 10,
            correlativo_fin: 5,
            correlativo_actual: 9,
            estado: false,
          },
        }),
      ).rejects.toThrow();
      expect(
        await prisma.serieComprobante.count({ where: { serie: 'BZ93' } }),
      ).toBe(0);
    });

    // Sin pasar por el caso de uso: el repositorio traduce P2002 a 409.
    describe('el repositorio traduce P2002 a ResourceConflictError', () => {
      const params = {
        tipo: TipoComprobante.BOLETA,
        correlativo_inicio: 1,
        correlativo_fin: 10,
        correlativo_actual: 0,
        umbral_alerta: 100,
      };

      it('create con un código duplicado', async () => {
        await expect(
          repository.create({ ...params, serie: 'BZ91', estado: false }),
        ).rejects.toBeInstanceOf(ResourceConflictError);
      });

      it('create de una segunda serie activa del mismo tipo', async () => {
        await expect(
          repository.create({ ...params, serie: 'BZ93', estado: true }),
        ).rejects.toBeInstanceOf(ResourceConflictError);
        expect(
          await prisma.serieComprobante.count({ where: { serie: 'BZ93' } }),
        ).toBe(0);
      });

      it('setStatus activando una segunda serie del mismo tipo', async () => {
        await expect(
          repository.setStatus(ids.BZ92, true),
        ).rejects.toBeInstanceOf(ResourceConflictError);
        const bz92 = await prisma.serieComprobante.findUniqueOrThrow({
          where: { id: ids.BZ92 },
        });
        expect(bz92.estado).toBe(false);
      });
    });

    it('GET /:id devuelve la serie y 404 si no existe', async () => {
      const response = await http()
        .get(`${BASE}/${ids.BZ91}`)
        .set(auth(adminToken))
        .expect(200);
      expect((response.body as SerieHttp).serie).toBe('BZ91');

      await http()
        .get(`${BASE}/${ID_INEXISTENTE}`)
        .set(auth(adminToken))
        .expect(404);
    });
  });

  describe('reserva de correlativos', () => {
    it('el primero es el inicio y luego suma 1, sin avanzar otras series', async () => {
      await expect(reservar.execute(TipoComprobante.BOLETA)).resolves.toEqual({
        serie_id: ids.BZ91,
        serie: 'BZ91',
        numero: 1,
      });
      await expect(reservar.execute(TipoComprobante.BOLETA)).resolves.toEqual({
        serie_id: ids.BZ91,
        serie: 'BZ91',
        numero: 2,
      });
      await expect(
        reservar.execute(TipoComprobante.FACTURA),
      ).resolves.toMatchObject({ serie: 'FZ91', numero: 100 });

      const bz92 = await prisma.serieComprobante.findUniqueOrThrow({
        where: { id: ids.BZ92 },
      });
      expect(bz92.correlativo_actual).toBe(0);
    });
  });

  describe('editar', () => {
    it('tras emitir, cambiar código, tipo o inicio responde 409', async () => {
      for (const body of [
        { serie: 'BZ98' },
        { correlativo_inicio: 2 },
        { tipo: 'factura', serie: 'FZ98' },
      ]) {
        await http()
          .patch(`${BASE}/${ids.BZ91}`)
          .set(auth(adminToken))
          .send(body)
          .expect(409);
      }
    });

    it('tras emitir, reducir el fin responde 409 (también bajo el actual)', async () => {
      for (const fin of [4, 1]) {
        await http()
          .patch(`${BASE}/${ids.BZ91}`)
          .set(auth(adminToken))
          .send({ correlativo_fin: fin })
          .expect(409);
      }
    });

    it('tras emitir, ampliar el fin y cambiar el umbral responde 200', async () => {
      const response = await http()
        .patch(`${BASE}/${ids.BZ91}`)
        .set(auth(adminToken))
        .send({ correlativo_fin: 10, umbral_alerta: 8 })
        .expect(200);

      expect(response.body).toMatchObject({
        correlativo_fin: 10,
        correlativo_actual: 2,
        siguiente: 3,
        restantes: 8,
        umbral_alerta: 8,
        por_agotar: true,
      });
    });

    it('sin emitir, se puede editar todo; el prefijo se valida (400)', async () => {
      await http()
        .patch(`${BASE}/${ids.BZ92}`)
        .set(auth(adminToken))
        .send({ tipo: 'factura' })
        .expect(400);

      const response = await http()
        .patch(`${BASE}/${ids.BZ92}`)
        .set(auth(adminToken))
        .send({ correlativo_inicio: 50, correlativo_fin: 60 })
        .expect(200);
      expect(response.body).toMatchObject({
        correlativo_inicio: 50,
        correlativo_fin: 60,
        correlativo_actual: null,
        siguiente: 50,
        restantes: 11,
      });
    });

    it('404 si la serie no existe', async () => {
      await http()
        .patch(`${BASE}/${ID_INEXISTENTE}`)
        .set(auth(adminToken))
        .send({ umbral_alerta: 1 })
        .expect(404);
    });

    it.each([
      [{ umbral_alerta: null }],
      [{ correlativo_fin: null }],
      [{ serie: null }],
      [{ tipo: null }],
      [{ correlativo_inicio: null }],
    ])('un null explícito responde 400 (%o)', async (body) => {
      for (const id of [ids.BZ91, ids.BZ92]) {
        await http()
          .patch(`${BASE}/${id}`)
          .set(auth(adminToken))
          .send(body)
          .expect(400);
      }
    });

    it('POST con umbral_alerta null responde 400', async () => {
      await crear({
        tipo: 'boleta',
        serie: 'BZ93',
        correlativo_inicio: 1,
        correlativo_fin: 10,
        umbral_alerta: null,
        estado: false,
      }).expect(400);
    });

    it('la condición optimista rechaza con 409 si el correlativo cambió', async () => {
      const antes = await prisma.serieComprobante.findUniqueOrThrow({
        where: { id: ids.BZ92 },
      });

      await expect(
        repository.update(
          ids.BZ92,
          { umbral_alerta: 7 },
          antes.correlativo_actual + 1,
        ),
      ).rejects.toBeInstanceOf(ResourceConflictError);

      const despues = await prisma.serieComprobante.findUniqueOrThrow({
        where: { id: ids.BZ92 },
      });
      expect(despues.umbral_alerta).toBe(antes.umbral_alerta);

      // Con el valor correcto, la misma llamada sí actualiza.
      await expect(
        repository.update(
          ids.BZ92,
          { umbral_alerta: antes.umbral_alerta },
          antes.correlativo_actual,
        ),
      ).resolves.toMatchObject({ umbral_alerta: antes.umbral_alerta });
    });
  });

  describe('alertas y filtros', () => {
    it('GET /alertas devuelve solo las activas por agotar', async () => {
      const response = await http()
        .get(`${BASE}/alertas`)
        .set(auth(adminToken))
        .expect(200);
      const series = (response.body as SerieHttp[]).map((s) => s.serie);
      expect(series).toContain('BZ91');
      expect(series).not.toContain('FZ91');
      expect(series).not.toContain('BZ92');
    });

    it('GET filtra por por_agotar, tipo y estado', async () => {
      const listar = async (query: string) => {
        const response = await http()
          .get(`${BASE}?limit=100&${query}`)
          .set(auth(adminToken))
          .expect(200);
        return (response.body as ListadoHttp).data.map((s) => s.serie);
      };

      const porAgotar = await listar('por_agotar=true');
      expect(porAgotar).toContain('BZ91');
      expect(porAgotar).not.toContain('FZ91');

      const noPorAgotar = await listar('por_agotar=false');
      expect(noPorAgotar).toContain('FZ91');
      expect(noPorAgotar).toContain('BZ92');
      expect(noPorAgotar).not.toContain('BZ91');

      const facturas = await listar('tipo=factura');
      expect(facturas).toContain('FZ91');
      expect(facturas).not.toContain('BZ91');

      const inactivas = await listar('estado=false');
      expect(inactivas).toContain('BZ92');
      expect(inactivas).not.toContain('BZ91');

      await http().get(`${BASE}?tipo=nota`).set(auth(adminToken)).expect(400);
    });
  });

  describe('activar y desactivar', () => {
    it('DELETE desactiva conservando el correlativo; la inactiva no reserva', async () => {
      const response = await http()
        .delete(`${BASE}/${ids.BZ91}`)
        .set(auth(adminToken))
        .expect(200);
      expect(response.body).toMatchObject({
        estado: false,
        correlativo_actual: 2,
        por_agotar: false,
      });

      await expect(motivoDe(TipoComprobante.BOLETA)).resolves.toBe(
        'serie_inactiva',
      );
    });

    it('activar una segunda del mismo tipo responde 409', async () => {
      await http()
        .patch(`${BASE}/${ids.BZ92}/activate`)
        .set(auth(adminToken))
        .expect(200);
      await http()
        .patch(`${BASE}/${ids.BZ91}/activate`)
        .set(auth(adminToken))
        .expect(409);
      await http()
        .delete(`${BASE}/${ids.BZ92}`)
        .set(auth(adminToken))
        .expect(200);
    });

    it('al reactivar continúa desde el último emitido', async () => {
      await http()
        .patch(`${BASE}/${ids.BZ91}/activate`)
        .set(auth(adminToken))
        .expect(200);

      await expect(
        reservar.execute(TipoComprobante.BOLETA),
      ).resolves.toMatchObject({ serie: 'BZ91', numero: 3 });
    });

    it('404 si la serie no existe', async () => {
      await http()
        .delete(`${BASE}/${ID_INEXISTENTE}`)
        .set(auth(adminToken))
        .expect(404);
      await http()
        .patch(`${BASE}/${ID_INEXISTENTE}/activate`)
        .set(auth(adminToken))
        .expect(404);
    });
  });

  describe('concurrencia y agotamiento', () => {
    it('N reservas en paralelo dan N números distintos y consecutivos', async () => {
      const N = 25;
      await http()
        .patch(`${BASE}/${ids.BZ91}`)
        .set(auth(adminToken))
        .send({ correlativo_fin: 1000 })
        .expect(200);

      const reservas = await Promise.all(
        Array.from({ length: N }, () =>
          reservar.execute(TipoComprobante.BOLETA),
        ),
      );

      const numeros = reservas.map((r) => r.numero).sort((a, b) => a - b);
      expect(new Set(numeros).size).toBe(N);
      expect(numeros).toEqual(Array.from({ length: N }, (_, i) => 4 + i));
      expect(reservas.every((r) => r.serie_id === ids.BZ91)).toBe(true);

      const fila = await prisma.serieComprobante.findUniqueOrThrow({
        where: { id: ids.BZ91 },
      });
      expect(fila.correlativo_actual).toBe(3 + N);
    });

    it('en paralelo nunca entrega números fuera del rango', async () => {
      await http()
        .delete(`${BASE}/${ids.FZ91}`)
        .set(auth(adminToken))
        .expect(200);
      await crear({
        tipo: 'factura',
        serie: 'FZ92',
        correlativo_inicio: 1,
        correlativo_fin: 3,
      }).expect(201);

      const resultados = await Promise.allSettled(
        Array.from({ length: 6 }, () =>
          reservar.execute(TipoComprobante.FACTURA),
        ),
      );

      const entregados = resultados
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value.numero)
        .sort((a, b) => a - b);
      expect(entregados).toEqual([1, 2, 3]);

      const rechazos = resultados.filter((r) => r.status === 'rejected');
      expect(rechazos).toHaveLength(3);
      for (const rechazo of rechazos) {
        expect(rechazo.reason).toBeInstanceOf(CorrelativoNoDisponibleError);
        expect((rechazo.reason as CorrelativoNoDisponibleError).motivo).toBe(
          'serie_agotada',
        );
      }

      const response = await http()
        .get(`${BASE}/alertas`)
        .set(auth(adminToken))
        .expect(200);
      expect(
        (response.body as SerieHttp[]).find((s) => s.serie === 'FZ92'),
      ).toMatchObject({ restantes: 0, siguiente: null, por_agotar: true });
    });
  });
});
