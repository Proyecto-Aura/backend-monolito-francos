import { PedidoEntity } from '../../../domain/entities';
import { EstadoPedido, OrigenPedido, TipoEntrega } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { DespacharPedidoUseCase } from './despachar-pedido.use-case';

describe('DespacharPedidoUseCase', () => {
  const findById = jest.fn();
  const marcarEnCamino = jest.fn();
  const findDetalleById = jest.fn();

  const pedidoRepository = {
    findById,
    marcarEnCamino,
    findDetalleById,
  } as unknown as jest.Mocked<PedidoRepository>;

  const useCase = new DespacharPedidoUseCase(pedidoRepository);

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
    findById.mockResolvedValue(makePedido(EstadoPedido.PENDIENTE_ENTREGA));
    marcarEnCamino.mockResolvedValue(true);
  });

  it('pasa un pedido pendiente de entrega a en camino y notifica al cliente (RF-A096, RF-A097)', async () => {
    const detalle = { pedido: makePedido(EstadoPedido.EN_CAMINO) };
    findDetalleById.mockResolvedValue(detalle);

    await expect(useCase.execute(7)).resolves.toBe(detalle);
    expect(marcarEnCamino).toHaveBeenCalledWith(7, {
      titulo: 'Tu pedido está en camino',
      mensaje: 'Tu pedido PED-000007 salió a reparto y está en camino.',
    });
  });

  it.each([
    EstadoPedido.CONFIRMADO,
    EstadoPedido.EN_ESPERA_INVENTARIO,
    EstadoPedido.EN_PREPARACION,
    EstadoPedido.EN_CAMINO,
    EstadoPedido.ENTREGADO,
    EstadoPedido.CANCELADO,
  ])('no saca a reparto un pedido en %s', async (estadoActual) => {
    findById.mockResolvedValue(makePedido(estadoActual));

    await expect(useCase.execute(7)).rejects.toThrow(
      new ResourceConflictError(
        `No se puede pasar el pedido PED-000007 de ${estadoActual} a en_camino`,
      ),
    );
    expect(marcarEnCamino).not.toHaveBeenCalled();
  });

  it('falla si otro usuario cambió el estado mientras tanto', async () => {
    marcarEnCamino.mockResolvedValue(false);

    await expect(useCase.execute(7)).rejects.toThrow(ResourceConflictError);
    expect(findDetalleById).not.toHaveBeenCalled();
  });

  it('falla si el pedido no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(99)).rejects.toThrow(ResourceNotFoundError);
    expect(marcarEnCamino).not.toHaveBeenCalled();
  });
});
