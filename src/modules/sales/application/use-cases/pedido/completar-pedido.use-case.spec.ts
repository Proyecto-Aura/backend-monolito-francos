import { PedidoEntity } from '../../../domain/entities';
import { EstadoPedido, OrigenPedido, TipoEntrega } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { CompletarPedidoUseCase } from './completar-pedido.use-case';

describe('CompletarPedidoUseCase', () => {
  const findById = jest.fn();
  const marcarEntregado = jest.fn();

  const pedidoRepository = {
    findById,
    marcarEntregado,
  } as unknown as jest.Mocked<PedidoRepository>;

  const useCase = new CompletarPedidoUseCase(pedidoRepository);

  const makePedido = (estado: EstadoPedido) =>
    new PedidoEntity(
      7,
      'PED-000007',
      'c7b2e2e3-2222-4d2b-8b1f-4c6c3a7a0002',
      null,
      OrigenPedido.MANUAL,
      estado,
      TipoEntrega.DELIVERY,
      'Av. La Marina 1450, San Miguel',
      165.6,
      new Date('2026-10-17T15:00:00.000Z'),
      new Date('2026-10-17T15:00:00.000Z'),
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marca como entregado (y descuenta stock) un pedido en camino', async () => {
    const entregado = makePedido(EstadoPedido.ENTREGADO);
    findById.mockResolvedValue(makePedido(EstadoPedido.EN_CAMINO));
    marcarEntregado.mockResolvedValue(entregado);

    await expect(useCase.execute(7)).resolves.toBe(entregado);
    expect(marcarEntregado).toHaveBeenCalledWith(7);
  });

  it.each([
    EstadoPedido.CONFIRMADO,
    EstadoPedido.EN_ESPERA_INVENTARIO,
    EstadoPedido.EN_PREPARACION,
    EstadoPedido.PENDIENTE_ENTREGA,
    EstadoPedido.ENTREGADO,
    EstadoPedido.CANCELADO,
  ])('no completa un pedido en estado %s', async (estado) => {
    findById.mockResolvedValue(makePedido(estado));

    await expect(useCase.execute(7)).rejects.toThrow(ResourceConflictError);
    expect(marcarEntregado).not.toHaveBeenCalled();
  });

  it('falla si el pedido no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(99)).rejects.toThrow(ResourceNotFoundError);
    expect(marcarEntregado).not.toHaveBeenCalled();
  });
});
