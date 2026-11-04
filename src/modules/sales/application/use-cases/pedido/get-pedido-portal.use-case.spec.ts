import { EstadoPedido } from '../../../domain/enums';
import { ResourceNotFoundError } from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { PedidoDetalle } from '../../../domain/repositories/types/pedido-repository.types';
import { GetPedidoPortalUseCase } from './get-pedido-portal.use-case';

describe('GetPedidoPortalUseCase', () => {
  const findClienteParaResumenPorUser = jest.fn();
  const findDetalleById = jest.fn();

  const useCase = new GetPedidoPortalUseCase({
    findClienteParaResumenPorUser,
    findDetalleById,
  } as unknown as PedidoRepository);

  const USER_ID = 'b6a1f1d2-1111-4c1a-9a0e-3b5b2f6f0001';
  const CLIENTE_ID = 'c7b2e2e3-2222-4d2b-8b1f-4c6c3a7a0002';
  const OTRO_CLIENTE_ID = 'd8c3f3f4-3333-4e3c-9c2a-5d7d4b8b0003';

  const detalle = (clienteId: string): PedidoDetalle =>
    ({
      pedido: {
        id: 7,
        cliente_id: clienteId,
        estado: EstadoPedido.CONFIRMADO,
      },
      cliente_nombre: 'Rosa Quispe',
      detalles: [],
      pago: null,
    }) as unknown as PedidoDetalle;

  beforeEach(() => {
    jest.resetAllMocks();
    findClienteParaResumenPorUser.mockResolvedValue({
      id: CLIENTE_ID,
      estado: true,
      direccion: null,
    });
  });

  it('devuelve el pedido del cliente con su estado (RF-B37)', async () => {
    const propio = detalle(CLIENTE_ID);
    findDetalleById.mockResolvedValue(propio);

    await expect(useCase.execute(7, USER_ID)).resolves.toBe(propio);

    expect(findClienteParaResumenPorUser).toHaveBeenCalledWith(USER_ID);
    expect(findDetalleById).toHaveBeenCalledWith(7);
  });

  it('responde que no existe si el pedido es de otro cliente', async () => {
    findDetalleById.mockResolvedValue(detalle(OTRO_CLIENTE_ID));

    await expect(useCase.execute(7, USER_ID)).rejects.toThrow(
      new ResourceNotFoundError('Pedido no encontrado'),
    );
  });

  it('responde que no existe si el pedido no existe', async () => {
    findDetalleById.mockResolvedValue(null);

    await expect(useCase.execute(999, USER_ID)).rejects.toThrow(
      new ResourceNotFoundError('Pedido no encontrado'),
    );
  });

  it('falla si el usuario no tiene un cliente, sin buscar el pedido', async () => {
    findClienteParaResumenPorUser.mockResolvedValue(null);

    await expect(useCase.execute(7, USER_ID)).rejects.toThrow(
      ResourceNotFoundError,
    );

    expect(findDetalleById).not.toHaveBeenCalled();
  });
});
