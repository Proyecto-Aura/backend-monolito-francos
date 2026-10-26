import { MetodoPago, OrigenPedido, TipoEntrega } from '../../../domain/enums';
import {
  PagoRechazadoError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import {
  ClienteParaPedido,
  CreatePedidoParams,
  PresentacionParaPedido,
} from '../../../domain/repositories/types/pedido-repository.types';
import { PasarelaPagoService } from '../../../domain/services/pasarela-pago.service';
import { CreatePedidoDto } from '../../dto/pedido-dtos/create-pedido.dto';
import { CreatePedidoUseCase } from './create-pedido.use-case';

describe('CreatePedidoUseCase', () => {
  const findClienteParaPedido = jest.fn();
  const findPresentacionesParaPedido = jest.fn();
  const create = jest.fn();
  const cobrar = jest.fn();

  const pedidoRepository = {
    findClienteParaPedido,
    findPresentacionesParaPedido,
    create,
  } as unknown as jest.Mocked<PedidoRepository>;
  const pasarelaPago = {
    cobrar,
  } as unknown as jest.Mocked<PasarelaPagoService>;

  const useCase = new CreatePedidoUseCase(pedidoRepository, pasarelaPago);

  const USER_ID = 'b6a1f1d2-1111-4c1a-9a0e-3b5b2f6f0001';
  const CLIENTE_ID = 'c7b2e2e3-2222-4d2b-8b1f-4c6c3a7a0002';

  const cliente = (
    overrides: Partial<ClienteParaPedido> = {},
  ): ClienteParaPedido => ({
    id: CLIENTE_ID,
    estado: true,
    email: 'cliente@francos.test',
    ...overrides,
  });

  const presentacion = (
    overrides: Partial<PresentacionParaPedido> = {},
  ): PresentacionParaPedido => ({
    id: 10,
    estado: true,
    producto_estado: true,
    precio_unitario: 5.5,
    precio_mayorista: 4.2,
    umbral_mayorista: 24,
    visible_portal_b: true,
    ...overrides,
  });

  const dto = (overrides: Partial<CreatePedidoDto> = {}): CreatePedidoDto => ({
    cliente_id: CLIENTE_ID,
    items: [
      { producto_presentacion_id: 10, cantidad: 30 },
      { producto_presentacion_id: 11, cantidad: 4 },
    ],
    tipo_entrega: TipoEntrega.DELIVERY,
    direccion_entrega: 'Av. La Marina 1450, San Miguel',
    metodo_pago: MetodoPago.EFECTIVO,
    ...overrides,
  });

  const createParams = (): CreatePedidoParams =>
    (create.mock.calls as CreatePedidoParams[][])[0][0];

  beforeEach(() => {
    jest.clearAllMocks();
    findClienteParaPedido.mockResolvedValue(cliente());
    findPresentacionesParaPedido.mockResolvedValue([
      presentacion(),
      presentacion({
        id: 11,
        precio_unitario: 9.9,
        precio_mayorista: null,
        umbral_mayorista: null,
      }),
    ]);
    create.mockImplementation((params: CreatePedidoParams) =>
      Promise.resolve(params),
    );
  });

  it('registra un pedido manual en efectivo con precios, total y pago calculados', async () => {
    await useCase.execute(dto(), USER_ID);

    expect(findPresentacionesParaPedido).toHaveBeenCalledWith([10, 11]);
    expect(cobrar).not.toHaveBeenCalled();
    expect(createParams()).toEqual({
      cliente_id: CLIENTE_ID,
      user_id: USER_ID,
      origen: OrigenPedido.MANUAL,
      tipo_entrega: TipoEntrega.DELIVERY,
      direccion_entrega: 'Av. La Marina 1450, San Miguel',
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
        metodo_pago: MetodoPago.EFECTIVO,
        monto: 165.6,
        numero_operacion: null,
        fecha_pago: expect.any(Date) as Date,
      },
    });
  });

  it('en recojo en tienda no guarda dirección aunque se envíe', async () => {
    await useCase.execute(
      dto({ tipo_entrega: TipoEntrega.RECOJO_TIENDA }),
      USER_ID,
    );

    expect(createParams().direccion_entrega).toBeNull();
  });

  it('con Culqi cobra el total y guarda el id del cargo como número de operación', async () => {
    const fechaCargo = new Date('2026-10-17T15:04:00.000Z');
    cobrar.mockResolvedValue({
      aprobado: true,
      numero_operacion: 'chr_test_abc123',
      fecha: fechaCargo,
    });

    await useCase.execute(
      dto({ metodo_pago: MetodoPago.CULQI, culqi_token: 'tkn_test_123' }),
      USER_ID,
    );

    expect(cobrar).toHaveBeenCalledWith({
      token: 'tkn_test_123',
      monto: 165.6,
      email: 'cliente@francos.test',
      descripcion: "Pedido Franco's",
    });
    expect(createParams().pago).toEqual({
      metodo_pago: MetodoPago.CULQI,
      monto: 165.6,
      numero_operacion: 'chr_test_abc123',
      fecha_pago: fechaCargo,
    });
  });

  it('si Culqi rechaza el pago no registra el pedido', async () => {
    cobrar.mockResolvedValue({
      aprobado: false,
      mensaje: 'Tu tarjeta no tiene fondos suficientes.',
    });

    await expect(
      useCase.execute(
        dto({ metodo_pago: MetodoPago.CULQI, culqi_token: 'tkn_test_123' }),
        USER_ID,
      ),
    ).rejects.toThrow(
      new PagoRechazadoError('Tu tarjeta no tiene fondos suficientes.'),
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('con Culqi exige que el cliente tenga correo', async () => {
    findClienteParaPedido.mockResolvedValue(cliente({ email: null }));

    await expect(
      useCase.execute(
        dto({ metodo_pago: MetodoPago.CULQI, culqi_token: 'tkn_test_123' }),
        USER_ID,
      ),
    ).rejects.toThrow(ResourceConflictError);
    expect(cobrar).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('falla si el cliente no existe', async () => {
    findClienteParaPedido.mockResolvedValue(null);

    await expect(useCase.execute(dto(), USER_ID)).rejects.toThrow(
      ResourceNotFoundError,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('falla si el cliente está inactivo', async () => {
    findClienteParaPedido.mockResolvedValue(cliente({ estado: false }));

    await expect(useCase.execute(dto(), USER_ID)).rejects.toThrow(
      ResourceConflictError,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('falla si una presentación no existe', async () => {
    findPresentacionesParaPedido.mockResolvedValue([presentacion()]);

    await expect(useCase.execute(dto(), USER_ID)).rejects.toThrow(
      new ResourceNotFoundError('La presentación 11 no existe'),
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('falla si una presentación está desactivada', async () => {
    findPresentacionesParaPedido.mockResolvedValue([
      presentacion(),
      presentacion({ id: 11, estado: false }),
    ]);

    await expect(useCase.execute(dto(), USER_ID)).rejects.toThrow(
      new ResourceConflictError('La presentación 11 está desactivada'),
    );
  });

  it('falla si el producto de una presentación está desactivado', async () => {
    findPresentacionesParaPedido.mockResolvedValue([
      presentacion({ producto_estado: false }),
      presentacion({ id: 11 }),
    ]);

    await expect(useCase.execute(dto(), USER_ID)).rejects.toThrow(
      new ResourceConflictError('La presentación 10 está desactivada'),
    );
  });

  it('no cobra con Culqi si alguna presentación no es válida', async () => {
    findPresentacionesParaPedido.mockResolvedValue([presentacion()]);

    await expect(
      useCase.execute(
        dto({ metodo_pago: MetodoPago.CULQI, culqi_token: 'tkn_test_123' }),
        USER_ID,
      ),
    ).rejects.toThrow(ResourceNotFoundError);
    expect(cobrar).not.toHaveBeenCalled();
  });
});
