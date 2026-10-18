import { PedidoEntity } from '../../../domain/entities';
import { EstadoPedido, OrigenPedido, TipoEntrega } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { ActualizarEstadoPedidoUseCase } from './actualizar-estado-pedido.use-case';

describe('ActualizarEstadoPedidoUseCase', () => {
  const findById = jest.fn();
  const cambiarEstado = jest.fn();
  const findDetalleById = jest.fn();

  const pedidoRepository = {
    findById,
    cambiarEstado,
    findDetalleById,
  } as unknown as jest.Mocked<PedidoRepository>;

  const useCase = new ActualizarEstadoPedidoUseCase(pedidoRepository);

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
    findById.mockResolvedValue(makePedido(EstadoPedido.CONFIRMADO));
    cambiarEstado.mockResolvedValue(true);
  });

  it('pasa un pedido confirmado a en espera de inventario (RF-A038)', async () => {
    const detalle = { pedido: makePedido(EstadoPedido.EN_ESPERA_INVENTARIO) };
    findDetalleById.mockResolvedValue(detalle);

    await expect(
      useCase.execute(7, EstadoPedido.EN_ESPERA_INVENTARIO),
    ).resolves.toBe(detalle);
    expect(cambiarEstado).toHaveBeenCalledWith(
      7,
      EstadoPedido.CONFIRMADO,
      EstadoPedido.EN_ESPERA_INVENTARIO,
    );
  });

  it.each([
    EstadoPedido.CONFIRMADO,
    EstadoPedido.EN_PREPARACION,
    EstadoPedido.PENDIENTE_ENTREGA,
    EstadoPedido.EN_CAMINO,
    EstadoPedido.ENTREGADO,
    EstadoPedido.CANCELADO,
  ])(
    'no deja a ventas pasar un pedido confirmado a %s (RN6)',
    async (estado) => {
      await expect(useCase.execute(7, estado)).rejects.toThrow(
        ResourceConflictError,
      );
      expect(cambiarEstado).not.toHaveBeenCalled();
    },
  );

  it.each([
    EstadoPedido.EN_ESPERA_INVENTARIO,
    EstadoPedido.EN_PREPARACION,
    EstadoPedido.ENTREGADO,
    EstadoPedido.CANCELADO,
  ])('no envía a inventario un pedido que está en %s', async (estadoActual) => {
    findById.mockResolvedValue(makePedido(estadoActual));

    await expect(
      useCase.execute(7, EstadoPedido.EN_ESPERA_INVENTARIO),
    ).rejects.toThrow(
      new ResourceConflictError(
        `No se puede pasar el pedido PED-000007 de ${estadoActual} a en_espera_inventario`,
      ),
    );
    expect(cambiarEstado).not.toHaveBeenCalled();
  });

  it('falla si otro usuario cambió el estado mientras tanto', async () => {
    cambiarEstado.mockResolvedValue(false);

    await expect(
      useCase.execute(7, EstadoPedido.EN_ESPERA_INVENTARIO),
    ).rejects.toThrow(ResourceConflictError);
    expect(findDetalleById).not.toHaveBeenCalled();
  });

  it('falla si el pedido no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(
      useCase.execute(99, EstadoPedido.EN_ESPERA_INVENTARIO),
    ).rejects.toThrow(ResourceNotFoundError);
    expect(cambiarEstado).not.toHaveBeenCalled();
  });
});
