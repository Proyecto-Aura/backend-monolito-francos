import {
  MetodoPago,
  OrigenPedido,
  TipoEntrega,
  TipoComprobante,
} from '../../../domain/enums';
import {
  PagoRechazadoError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { ClienteParaResumen } from '../../../domain/repositories/types/pedido-repository.types';
import { CrearPedidoPortalDto } from '../../dto/pedido-dtos/crear-pedido-portal.dto';
import { CrearPedidoPortalUseCase } from './crear-pedido-portal.use-case';
import {
  ResumenPedidoPortal,
  ResumirPedidoPortalUseCase,
} from './resumir-pedido-portal.use-case';

describe('CrearPedidoPortalUseCase', () => {
  const findClienteParaResumenPorUser = jest.fn();
  const create = jest.fn();
  const notificarPagoRechazado = jest.fn();
  const cobrar = jest.fn();
  const resumir = jest.fn();

  const useCase = new CrearPedidoPortalUseCase(
    {
      findClienteParaResumenPorUser,
      create,
      notificarPagoRechazado,
    } as unknown as PedidoRepository,
    { cobrar },
    { execute: resumir } as unknown as ResumirPedidoPortalUseCase,
  );

  const USER_ID = 'b6a1f1d2-1111-4c1a-9a0e-3b5b2f6f0001';
  const CLIENTE_ID = 'c7b2e2e3-2222-4d2b-8b1f-4c6c3a7a0002';
  const EMAIL = 'cliente@francos.test';

  const cliente = (
    overrides: Partial<ClienteParaResumen> = {},
  ): ClienteParaResumen => ({
    id: CLIENTE_ID,
    estado: true,
    direccion: 'Jr. Huallaga 320',
    email: EMAIL,
    ...overrides,
  });

  const resumen = (
    overrides: Partial<ResumenPedidoPortal> = {},
  ): ResumenPedidoPortal => ({
    tipo_entrega: TipoEntrega.DELIVERY,
    direccion_perfil: 'Jr. Huallaga 320',
    direccion_entrega: 'Av. Los Olivos 123',
    comprobante: {
      tipo_comprobante: TipoComprobante.BOLETA,
      ruc: null,
      razon_social: null,
    },
    comprobante_sugerido: null,
    items: [
      {
        producto_presentacion_id: 10,
        cantidad: 30,
        precio_unitario: 5.5,
        precio_aplicado: 4.2,
        es_mayorista: true,
        subtotal: 126,
      },
      {
        producto_presentacion_id: 11,
        cantidad: 4,
        precio_unitario: 9.9,
        precio_aplicado: 9.9,
        es_mayorista: false,
        subtotal: 39.6,
      },
    ],
    subtotal: 165.6,
    total: 165.6,
    ...overrides,
  });

  const dto = (): CrearPedidoPortalDto => ({
    items: [
      { producto_presentacion_id: 10, cantidad: 30 },
      { producto_presentacion_id: 11, cantidad: 4 },
    ],
    tipo_entrega: TipoEntrega.DELIVERY,
    direccion_entrega: 'Av. Los Olivos 123',
    culqi_token: 'tkn_sim_ok_1',
  });

  beforeEach(() => {
    jest.resetAllMocks();
    resumir.mockResolvedValue(resumen());
    findClienteParaResumenPorUser.mockResolvedValue(cliente());
    cobrar.mockResolvedValue({
      aprobado: true,
      numero_operacion: 'chr_1',
      fecha: new Date('2026-11-02T10:00:00Z'),
    });
    create.mockResolvedValue({ pedido: { id: 1 } });
  });

  it('cobra el total que calcula el servidor con el correo del cliente', async () => {
    await useCase.execute(dto(), USER_ID);

    expect(cobrar).toHaveBeenCalledWith({
      token: 'tkn_sim_ok_1',
      monto: 165.6,
      email: EMAIL,
      descripcion: "Pedido Franco's",
    });
  });

  it('guarda el pedido ya pagado, del portal, con los precios del resumen (RN5, RN17)', async () => {
    await useCase.execute(dto(), USER_ID);

    expect(create).toHaveBeenCalledWith({
      cliente_id: CLIENTE_ID,
      user_id: USER_ID,
      origen: OrigenPedido.PORTAL,
      tipo_entrega: TipoEntrega.DELIVERY,
      direccion_entrega: 'Av. Los Olivos 123',
      total: 165.6,
      detalles: [
        {
          producto_presentacion_id: 10,
          cantidad: 30,
          precio_unitario: 5.5,
          precio_aplicado: 4.2,
          subtotal: 126,
        },
        {
          producto_presentacion_id: 11,
          cantidad: 4,
          precio_unitario: 9.9,
          precio_aplicado: 9.9,
          subtotal: 39.6,
        },
      ],
      pago: {
        metodo_pago: MetodoPago.CULQI,
        monto: 165.6,
        numero_operacion: 'chr_1',
        fecha_pago: new Date('2026-11-02T10:00:00Z'),
      },
      notificacion: {
        titulo: 'Pago confirmado',
        mensaje: expect.stringContaining('S/ 165.60') as unknown,
      },
    });
    expect(notificarPagoRechazado).not.toHaveBeenCalled();
  });

  it('en recojo en tienda no guarda dirección de entrega', async () => {
    resumir.mockResolvedValue(
      resumen({
        tipo_entrega: TipoEntrega.RECOJO_TIENDA,
        direccion_entrega: null,
      }),
    );

    await useCase.execute(dto(), USER_ID);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_entrega: TipoEntrega.RECOJO_TIENDA,
        direccion_entrega: null,
      }),
    );
  });

  it('si la pasarela rechaza el pago no guarda el pedido y avisa al cliente (RF-B26, RF-B27)', async () => {
    cobrar.mockResolvedValue({
      aprobado: false,
      mensaje: 'Tu tarjeta no tiene fondos suficientes.',
    });

    await expect(useCase.execute(dto(), USER_ID)).rejects.toThrow(
      new PagoRechazadoError('Tu tarjeta no tiene fondos suficientes.'),
    );

    expect(create).not.toHaveBeenCalled();
    expect(notificarPagoRechazado).toHaveBeenCalledWith(USER_ID, {
      titulo: 'Pago rechazado',
      mensaje: expect.stringContaining('S/ 165.60') as unknown,
    });
  });

  it('no cobra si el resumen falla (carrito inválido, cliente inactivo)', async () => {
    resumir.mockRejectedValue(
      new ResourceConflictError('El cliente está inactivo'),
    );

    await expect(useCase.execute(dto(), USER_ID)).rejects.toThrow(
      ResourceConflictError,
    );

    expect(cobrar).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('falla si el usuario no tiene cliente, sin cobrar', async () => {
    findClienteParaResumenPorUser.mockResolvedValue(null);

    await expect(useCase.execute(dto(), USER_ID)).rejects.toThrow(
      ResourceNotFoundError,
    );

    expect(cobrar).not.toHaveBeenCalled();
  });

  it('falla si la cuenta no tiene correo, sin cobrar', async () => {
    findClienteParaResumenPorUser.mockResolvedValue(cliente({ email: null }));

    await expect(useCase.execute(dto(), USER_ID)).rejects.toThrow(
      ResourceConflictError,
    );

    expect(cobrar).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
