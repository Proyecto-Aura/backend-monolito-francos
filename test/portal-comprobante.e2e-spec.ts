import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import {
  EnvioComprobanteParams,
  EnvioComprobanteService,
} from '../src/modules/sales/domain/services/envio-comprobante.service';
import {
  CobroResultado,
  PasarelaPagoService,
} from '../src/modules/sales/domain/services/pasarela-pago.service';

const PASSWORD = 'Compr1234';

const CLIENTE = {
  identificador: 'e2e-cliente-comprob',
  email: 'e2e-cliente-comprob@francos.test',
  documento: '99999971',
};

const CATEGORIA_NOMBRE = 'E2E Categoría Comprobante OFT0-541';
const PRESENTACION_DESCRIPCION = 'E2E Comprobante OFT0-541';
const PRODUCTO_NOMBRE = 'E2E Producto Comprobante OFT0-541';
const RUC_EMISORA = '20100047218';
const SERIE_BOLETA = 'B990';
const SERIE_FACTURA = 'F990';
const FACTURA = {
  tipo_comprobante: 'factura',
  ruc: '20601234565',
  razon_social: 'Distribuidora Andina S.A.C.',
};

// Doble de la pasarela: aprueba siempre, sin llamar a Culqi.
class FakePasarelaPago implements PasarelaPagoService {
  private cargos = 0;

  cobrar(): Promise<CobroResultado> {
    this.cargos += 1;
    return Promise.resolve({
      aprobado: true,
      numero_operacion: `chr_e2e_comprob_${Date.now()}_${this.cargos}`,
      fecha: new Date(),
    });
  }
}

// Doble del correo: guarda lo que se habría enviado y puede simular una caída.
class FakeEnvioComprobante implements EnvioComprobanteService {
  enviados: EnvioComprobanteParams[] = [];
  fallar = false;

  enviar(params: EnvioComprobanteParams): Promise<void> {
    if (this.fallar) return Promise.reject(new Error('SMTP caído'));
    this.enviados.push(params);
    return Promise.resolve();
  }
}

interface ComprobanteBody {
  tipo: string;
  codigo: string;
  serie: string;
  numero: number;
  ruc: string | null;
  razon_social: string | null;
  subtotal: number;
  total: number;
  fecha_emision: string;
}

interface PedidoBody {
  id: number;
  codigo: string;
  total: number;
  pago: { comprobante: ComprobanteBody | null } | null;
}

describe('Comprobante del pedido del portal (e2e, HU-B-010)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let presentacionId: number;
  const correo = new FakeEnvioComprobante();
  // Lo que ya existía antes del test (no se borra al terminar).
  let emisoraPrevia: number | null = null;
  const seriesPrevias: number[] = [];

  const pagar = (overrides: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/portal/pedidos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        // 3 x 9.90 = 29.70
        items: [{ producto_presentacion_id: presentacionId, cantidad: 3 }],
        tipo_entrega: 'recojo_tienda',
        culqi_token: 'tkn_sim_ok_e2e',
        ...overrides,
      });

  const deleteTestData = async () => {
    const pedidos = await prisma.pedido.findMany({
      where: {
        cliente: { persona: { numero_documento: CLIENTE.documento } },
      },
      select: { id: true },
    });
    const pedidoIds = pedidos.map(({ id }) => id);
    await prisma.comprobante.deleteMany({
      where: { pago: { pedido_id: { in: pedidoIds } } },
    });
    await prisma.pago.deleteMany({ where: { pedido_id: { in: pedidoIds } } });
    await prisma.detallePedido.deleteMany({
      where: { pedido_id: { in: pedidoIds } },
    });
    await prisma.pedido.deleteMany({ where: { id: { in: pedidoIds } } });

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: CLIENTE.identificador }, { email: CLIENTE.email }],
      },
      select: { id: true },
    });
    if (user) {
      await prisma.notificacionUser.deleteMany({ where: { user_id: user.id } });
      await prisma.$transaction([
        prisma.refreshToken.deleteMany({ where: { user_id: user.id } }),
        prisma.usuarioRol.deleteMany({ where: { user_id: user.id } }),
        prisma.user.delete({ where: { id: user.id } }),
      ]);
    }
    await prisma.cliente.deleteMany({
      where: { persona: { numero_documento: CLIENTE.documento } },
    });
    await prisma.persona.deleteMany({
      where: { numero_documento: CLIENTE.documento },
    });
    await prisma.notificacion.deleteMany({
      where: { tipo: 'pago_confirmado', notificacion_users: { none: {} } },
    });

    await prisma.serieComprobante.deleteMany({
      where: { serie: { in: [SERIE_BOLETA, SERIE_FACTURA] } },
    });
    await prisma.empresa.deleteMany({
      where: {
        ruc: RUC_EMISORA,
        es_emisora: true,
        id: { not: emisoraPrevia ?? 0 },
      },
    });

    const productos = await prisma.producto.findMany({
      where: { nombre: PRODUCTO_NOMBRE },
      select: { id: true },
    });
    const productoIds = productos.map(({ id }) => id);
    await prisma.productoPresentacion.deleteMany({
      where: { producto_id: { in: productoIds } },
    });
    await prisma.producto.deleteMany({ where: { id: { in: productoIds } } });
    await prisma.presentacion.deleteMany({
      where: { descripcion: PRESENTACION_DESCRIPCION },
    });
    await prisma.categoria.deleteMany({ where: { nombre: CATEGORIA_NOMBRE } });
  };

  // Deja las series del test como las únicas activas de su tipo.
  const activarSeriesDelTest = async () => {
    await prisma.serieComprobante.updateMany({
      where: { id: { in: seriesPrevias } },
      data: { estado: false },
    });
    await prisma.serieComprobante.updateMany({
      where: { serie: { in: [SERIE_BOLETA, SERIE_FACTURA] } },
      data: { estado: true },
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PasarelaPagoService)
      .useValue(new FakePasarelaPago())
      .overrideProvider(EnvioComprobanteService)
      .useValue(correo)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    emisoraPrevia =
      (
        await prisma.empresa.findFirst({
          where: { es_emisora: true },
          select: { id: true },
        })
      )?.id ?? null;
    await deleteTestData();

    if (!emisoraPrevia) {
      await prisma.empresa.create({
        data: {
          razon_social: "Franco's E2E S.A.C.",
          ruc: RUC_EMISORA,
          direccion: 'Av. Industrial 123, Lima',
          es_emisora: true,
        },
      });
    }

    seriesPrevias.push(
      ...(
        await prisma.serieComprobante.findMany({
          where: { estado: true },
          select: { id: true },
        })
      ).map(({ id }) => id),
    );
    await prisma.serieComprobante.updateMany({
      where: { id: { in: seriesPrevias } },
      data: { estado: false },
    });
    await prisma.serieComprobante.createMany({
      data: [
        {
          tipo: 'boleta',
          serie: SERIE_BOLETA,
          correlativo_inicio: 1,
          correlativo_fin: 99999999,
          correlativo_actual: 0,
        },
        {
          tipo: 'factura',
          serie: SERIE_FACTURA,
          correlativo_inicio: 1,
          correlativo_fin: 99999999,
          correlativo_actual: 0,
        },
      ],
    });

    const categoria = await prisma.categoria.create({
      data: { nombre: CATEGORIA_NOMBRE },
    });
    const presentacion = await prisma.presentacion.create({
      data: {
        cantidad: 7911,
        unidad_medida: 'gr',
        descripcion: PRESENTACION_DESCRIPCION,
      },
    });
    const producto = await prisma.producto.create({
      data: { categoria_id: categoria.id, nombre: PRODUCTO_NOMBRE },
    });
    presentacionId = (
      await prisma.productoPresentacion.create({
        data: {
          sku: `FR-P${producto.id}-PR${presentacion.id}`,
          producto_id: producto.id,
          presentacion_id: presentacion.id,
          precio_unitario: 9.9,
          visible_portal_b: true,
        },
      })
    ).id;

    const rol = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'cliente' },
    });
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Rosa Elena',
        apellido_paterno: 'Comprobante',
        apellido_materno: 'E2E',
        tipo_documento: 'dni',
        numero_documento: CLIENTE.documento,
      },
    });
    const user = await prisma.user.create({
      data: {
        persona_id: persona.id,
        email: CLIENTE.email,
        username: CLIENTE.identificador,
        contrasena: await hashPassword(PASSWORD),
        estado: true,
        email_verificado: true,
      },
    });
    await prisma.usuarioRol.create({
      data: { user_id: user.id, rol_id: rol.id, estado: true },
    });
    await prisma.cliente.create({
      data: {
        persona_id: persona.id,
        tipo_cliente: 'persona_natural',
        categoria_cliente: 'minorista',
        estado: true,
      },
    });

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador: CLIENTE.identificador, password: PASSWORD });
    token = (login.body as { access_token: string }).access_token;
  }, 30_000);

  afterAll(async () => {
    await deleteTestData();
    await prisma.serieComprobante.updateMany({
      where: { id: { in: seriesPrevias } },
      data: { estado: true },
    });
    await app.close();
  }, 30_000);

  beforeEach(async () => {
    correo.enviados = [];
    correo.fallar = false;
    await activarSeriesDelTest();
  });

  it('emite una boleta al confirmar el pago y la envía al correo del cliente (RF-B30, RF-B31)', async () => {
    const response = await pagar();

    expect(response.status).toBe(201);
    const pedido = response.body as PedidoBody;
    const comprobante = pedido.pago?.comprobante;
    expect(comprobante).toMatchObject({
      tipo: 'boleta',
      serie: SERIE_BOLETA,
      ruc: null,
      razon_social: null,
      subtotal: 29.7,
      total: 29.7,
    });
    expect(comprobante?.codigo).toBe(
      `${SERIE_BOLETA}-${String(comprobante?.numero).padStart(8, '0')}`,
    );

    const guardado = await prisma.comprobante.findFirstOrThrow({
      where: { pago: { pedido_id: pedido.id } },
    });
    expect(guardado.numero).toBe(comprobante?.numero);

    expect(correo.enviados).toHaveLength(1);
    expect(correo.enviados[0]).toMatchObject({
      to: CLIENTE.email,
      pedido_codigo: pedido.codigo,
      emisor: { ruc: expect.any(String) as unknown },
    });
  });

  it('emite una factura con el RUC y la razón social del pago, con el siguiente número de su serie', async () => {
    const primera = await pagar({ comprobante: FACTURA });
    const segunda = await pagar({ comprobante: FACTURA });

    expect(primera.status).toBe(201);
    expect(segunda.status).toBe(201);
    const a = (primera.body as PedidoBody).pago?.comprobante;
    const b = (segunda.body as PedidoBody).pago?.comprobante;
    expect(a).toMatchObject({
      tipo: 'factura',
      serie: SERIE_FACTURA,
      ruc: FACTURA.ruc,
      razon_social: FACTURA.razon_social,
    });
    expect(b?.numero).toBe((a?.numero ?? 0) + 1);
  });

  it('el detalle del pedido propio devuelve su comprobante', async () => {
    const pedido = (await pagar()).body as PedidoBody;

    const response = await request(app.getHttpServer())
      .get(`/api/v1/portal/pedidos/${pedido.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect((response.body as PedidoBody).pago?.comprobante).toEqual(
      pedido.pago?.comprobante,
    );
  });

  it('una factura con RUC inválido responde 400 y no crea el pedido', async () => {
    const antes = await prisma.pedido.count();

    const response = await pagar({
      comprobante: { ...FACTURA, ruc: '20601234566' },
    });

    expect(response.status).toBe(400);
    expect(await prisma.pedido.count()).toBe(antes);
  });

  it('sin serie activa de facturas el pedido pagado se crea igual, sin comprobante', async () => {
    await prisma.serieComprobante.updateMany({
      where: { serie: SERIE_FACTURA },
      data: { estado: false },
    });

    const response = await pagar({ comprobante: FACTURA });

    expect(response.status).toBe(201);
    const pedido = response.body as PedidoBody;
    expect(pedido.pago?.comprobante).toBeNull();
    expect(
      await prisma.comprobante.count({
        where: { pago: { pedido_id: pedido.id } },
      }),
    ).toBe(0);
    expect(correo.enviados).toHaveLength(0);
  });

  it('si el correo falla el comprobante queda emitido', async () => {
    correo.fallar = true;

    const response = await pagar();

    expect(response.status).toBe(201);
    expect((response.body as PedidoBody).pago?.comprobante?.tipo).toBe(
      'boleta',
    );
  });
});
