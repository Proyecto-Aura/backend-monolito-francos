import { PedidoEntity } from '../../../domain/entities';
import { EstadoPedido, OrigenPedido, TipoEntrega } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { CancelarPedidoPortalUseCase } from './cancelar-pedido-portal.use-case';

describe('CancelarPedidoPortalUseCase', () => {
  const findClienteParaResumenPorUser = jest.fn();
  const findDetalleById = jest.fn();
  const cambiarEstado = jest.fn();

  const pedidoRepository = {
    findClienteParaResumenPorUser,
    findDetalleById,
    cambiarEstado,
  } as unknown as jest.Mocked<PedidoRepository>;

  const useCase = new CancelarPedidoPortalUseCase(pedidoRepository);

  const USER_ID = 'b6a1f1d2-1111-4c1a-9a0e-3b5b2f6f0001';
  const CLIENTE_ID = 'c7b2e2e3-2222-4d2b-8b1f-4c6c3a7a0002';
  const FECHA = new Date('2026-11-10T00:00:00.000Z');

  const makePedido = (estado: EstadoPedido, clienteId = CLIENTE_ID) =>
    new PedidoEntity(
      7,
      'PED-000007',
      clienteId,
      USER_ID,
      OrigenPedido.PORTAL,
      estado,
      TipoEntrega.DELIVERY,
      'Av. Los Olivos 123',
      165.6,
      FECHA,
      FECHA,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    findClienteParaResumenPorUser.mockResolvedValue({
      id: CLIENTE_ID,
      estado: true,
      direccion: null,
    });
    cambiarEstado.mockResolvedValue(true);
  });

  it('cancela un pedido propio que sigue confirmado', async () => {
    findDetalleById
      .mockResolvedValueOnce({ pedido: makePedido(EstadoPedido.CONFIRMADO) })
      .mockResolvedValueOnce({ pedido: makePedido(EstadoPedido.CANCELADO) });

    const resultado = await useCase.execute(7, USER_ID);

    expect(cambiarEstado).toHaveBeenCalledWith(
      7,
      EstadoPedido.CONFIRMADO,
      EstadoPedido.CANCELADO,
    );
    expect(resultado.pedido.estado).toBe(EstadoPedido.CANCELADO);
  });

  it('cancela un pedido en en_espera_inventario: para el cliente es el mismo paso "Confirmado"', async () => {
    findDetalleById
      .mockResolvedValueOnce({
        pedido: makePedido(EstadoPedido.EN_ESPERA_INVENTARIO),
      })
      .mockResolvedValueOnce({ pedido: makePedido(EstadoPedido.CANCELADO) });

    await useCase.execute(7, USER_ID);

    expect(cambiarEstado).toHaveBeenCalledWith(
      7,
      EstadoPedido.EN_ESPERA_INVENTARIO,
      EstadoPedido.CANCELADO,
    );
  });

  it('no deja cancelar un pedido que ya está en preparación', async () => {
    findDetalleById.mockResolvedValue({
      pedido: makePedido(EstadoPedido.EN_PREPARACION),
    });

    await expect(useCase.execute(7, USER_ID)).rejects.toThrow(
      ResourceConflictError,
    );
    expect(cambiarEstado).not.toHaveBeenCalled();
  });

  it('falla si otro usuario lo cambió de estado mientras tanto', async () => {
    findDetalleById.mockResolvedValue({
      pedido: makePedido(EstadoPedido.CONFIRMADO),
    });
    cambiarEstado.mockResolvedValue(false);

    await expect(useCase.execute(7, USER_ID)).rejects.toThrow(
      ResourceConflictError,
    );
  });

  it('el pedido de otro cliente responde 404, como si no existiera', async () => {
    findDetalleById.mockResolvedValue({
      pedido: makePedido(EstadoPedido.CONFIRMADO, 'otro-cliente-id'),
    });

    await expect(useCase.execute(7, USER_ID)).rejects.toThrow(
      ResourceNotFoundError,
    );
    expect(cambiarEstado).not.toHaveBeenCalled();
  });

  it('un pedido que no existe responde 404', async () => {
    findDetalleById.mockResolvedValue(null);

    await expect(useCase.execute(999, USER_ID)).rejects.toThrow(
      ResourceNotFoundError,
    );
  });

  it('un usuario sin cliente responde 404', async () => {
    findClienteParaResumenPorUser.mockResolvedValue(null);

    await expect(useCase.execute(7, USER_ID)).rejects.toThrow(
      ResourceNotFoundError,
    );
    expect(findDetalleById).not.toHaveBeenCalled();
  });
});
