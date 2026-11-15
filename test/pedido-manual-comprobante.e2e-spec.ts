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

// `ventas` registra el pedido manual (RF-A032).
const VENTAS = {
  identificador: 'e2e-ventas-comprob',
  password: 'VentasE2e123',
  email: 'e2e-ventas-comprob@francos.test',
  documento: '99999991',
};

// Un cliente con correo (recibe el comprobante) y otro sin correo (igual se
// emite, pero no se intenta enviar — RF-A032 permite registrar en efectivo
// sin correo).
const CLIENTE_CON_CORREO = {
  documento: '99999992',
  email: 'e2e-cliente-comprob-manual@francos.test',
};
const CLIENTE_SIN_CORREO = { documento: '99999993' };

const CATEGORIA_NOMBRE = 'E2E Categoría Comprobante Manual OFT0-551';
const PRESENTACION_DESCRIPCION = 'E2E Comprobante Manual OFT0-551';
const PRODUCTO_NOMBRE = 'E2E Producto Comprobante Manual OFT0-551';
const RUC_EMISORA = '20100047218';
const SERIE_BOLETA = 'B991';
const SERIE_FACTURA = 'F991';
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
      numero_operacion: `chr_e2e_comprob_manual_${Date.now()}_${this.cargos}`,
      fecha: new Date(),
    });
  }
}

// Doble del correo: guarda lo que se habría enviado.
class FakeEnvioComprobante implements EnvioComprobanteService {
  enviados: EnvioComprobanteParams[] = [];

  enviar(params: EnvioComprobanteParams): Promise<void> {
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
}

interface PedidoBody {
  id: number;
  codigo: string;
  pago: { comprobante: ComprobanteBody | null } | null;
}

describe('Comprobante del pedido registrado manualmente (e2e, HU-B-010 + RF-A032)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ventasToken: string;
  let clienteConCorreoId: string;
  let clienteSinCorreoId: string;
  let presentacionId: number;
  const correo = new FakeEnvioComprobante();
  // Lo que ya existía antes del test (no se borra al terminar).
  let emisoraPrevia: number | null = null;
  const seriesPrevias: number[] = [];

  const crearPedido = (overrides: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/pedidos')
      .set('Authorization', `Bearer ${ventasToken}`)
      .send({
        cliente_id: clienteConCorreoId,
        items: [{ producto_presentacion_id: presentacionId, cantidad: 2 }],
        tipo_entrega: 'recojo_tienda',
        metodo_pago: 'efectivo',
        ...overrides,
      });

  const deleteTestData = async () => {
    const pedidos = await prisma.pedido.findMany({
      where: {
        cliente: {
          persona: {
            numero_documento: {
              in: [CLIENTE_CON_CORREO.documento, CLIENTE_SIN_CORREO.documento],
            },
          },
        },
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
    await prisma.cliente.deleteMany({
      where: {
        persona: {
          numero_documento: {
            in: [CLIENTE_CON_CORREO.documento, CLIENTE_SIN_CORREO.documento],
          },
        },
      },
    });

    const deleteUserByDocumento = async (
      documento: string,
      username: string,
      email: string,
    ) => {
      const user = await prisma.user.findFirst({
        where: { OR: [{ username }, { email }] },
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
        where: { numero_documento: documento },
      });
    };

    await deleteUserByDocumento(
      CLIENTE_CON_CORREO.documento,
      'e2e-cliente-comprob-manual',
      CLIENTE_CON_CORREO.email,
    );
    await prisma.persona.deleteMany({
      where: { numero_documento: CLIENTE_SIN_CORREO.documento },
    });
    await deleteUserByDocumento(
      VENTAS.documento,
      VENTAS.identificador,
      VENTAS.email,
    );

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

    const rolVentas = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ventas' },
    });
    const personaVentas = await prisma.persona.create({
      data: {
        nombres: 'Vendedor',
        apellido_paterno: 'E2E',
        apellido_materno: 'Comprobante',
        tipo_documento: 'dni',
        numero_documento: VENTAS.documento,
      },
    });
    const userVentas = await prisma.user.create({
      data: {
        persona_id: personaVentas.id,
        email: VENTAS.email,
        username: VENTAS.identificador,
        contrasena: await hashPassword(VENTAS.password),
        estado: true,
        email_verificado: true,
      },
    });
    await prisma.usuarioRol.create({
      data: { user_id: userVentas.id, rol_id: rolVentas.id, estado: true },
    });

    const personaConCorreo = await prisma.persona.create({
      data: {
        nombres: 'Cliente',
        apellido_paterno: 'Con',
        apellido_materno: 'Correo',
        tipo_documento: 'dni',
        numero_documento: CLIENTE_CON_CORREO.documento,
      },
    });
    await prisma.user.create({
      data: {
        persona_id: personaConCorreo.id,
        email: CLIENTE_CON_CORREO.email,
        username: 'e2e-cliente-comprob-manual',
        contrasena: await hashPassword('ClienteE2e1'),
        email_verificado: true,
      },
    });
    clienteConCorreoId = (
      await prisma.cliente.create({
        data: {
          persona_id: personaConCorreo.id,
          tipo_cliente: 'persona_natural',
          categoria_cliente: 'minorista',
        },
      })
    ).id;

    // Cliente sin cuenta de usuario: RF-A032 permite registrarle pedidos en
    // efectivo igual, sin correo al que enviar nada.
    const personaSinCorreo = await prisma.persona.create({
      data: {
        nombres: 'Cliente',
        apellido_paterno: 'Sin',
        apellido_materno: 'Correo',
        tipo_documento: 'dni',
        numero_documento: CLIENTE_SIN_CORREO.documento,
      },
    });
    clienteSinCorreoId = (
      await prisma.cliente.create({
        data: {
          persona_id: personaSinCorreo.id,
          tipo_cliente: 'persona_natural',
          categoria_cliente: 'minorista',
        },
      })
    ).id;

    const categoria = await prisma.categoria.create({
      data: { nombre: CATEGORIA_NOMBRE },
    });
    const presentacion = await prisma.presentacion.create({
      data: {
        cantidad: 250,
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
        },
      })
    ).id;

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador: VENTAS.identificador, password: VENTAS.password })
      .expect(201);
    ventasToken = (loginResponse.body as { access_token: string }).access_token;
  });

  // Deja las series del test como las únicas activas de su tipo.
  beforeEach(async () => {
    correo.enviados = [];
    await prisma.serieComprobante.updateMany({
      where: { id: { in: seriesPrevias } },
      data: { estado: false },
    });
    await prisma.serieComprobante.updateMany({
      where: { serie: { in: [SERIE_BOLETA, SERIE_FACTURA] } },
      data: { estado: true },
    });
  });

  afterAll(async () => {
    await deleteTestData();
    await prisma.serieComprobante.updateMany({
      where: { id: { in: seriesPrevias } },
      data: { estado: true },
    });
    await app.close();
  }, 30_000);

  it('en efectivo emite una boleta por defecto y la envía al correo del cliente', async () => {
    const response = await crearPedido().expect(201);
    const body = response.body as unknown as PedidoBody;

    expect(body.pago?.comprobante).toMatchObject({
      tipo: 'boleta',
      serie: SERIE_BOLETA,
      ruc: null,
      razon_social: null,
    });
    expect(correo.enviados).toHaveLength(1);
    expect(correo.enviados[0].to).toBe(CLIENTE_CON_CORREO.email);
  });

  it('con factura, emite con el RUC y la razón social elegidos', async () => {
    const response = await crearPedido({ comprobante: FACTURA }).expect(201);
    const body = response.body as unknown as PedidoBody;

    expect(body.pago?.comprobante).toMatchObject({
      tipo: 'factura',
      serie: SERIE_FACTURA,
      ruc: FACTURA.ruc,
      razon_social: FACTURA.razon_social,
    });
  });

  it('con un cliente sin correo, igual emite el comprobante pero no intenta enviarlo', async () => {
    const response = await crearPedido({
      cliente_id: clienteSinCorreoId,
    }).expect(201);
    const body = response.body as unknown as PedidoBody;

    expect(body.pago?.comprobante).toMatchObject({ tipo: 'boleta' });
    expect(correo.enviados).toHaveLength(0);
  });

  it('sin serie activa, el pedido se registra igualmente sin comprobante', async () => {
    await prisma.serieComprobante.updateMany({
      where: { serie: SERIE_BOLETA },
      data: { estado: false },
    });

    const response = await crearPedido().expect(201);
    const body = response.body as unknown as PedidoBody;

    expect(body.pago?.comprobante).toBeNull();
  });
});
