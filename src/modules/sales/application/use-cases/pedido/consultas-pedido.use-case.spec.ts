import { EstadoPedido, OrigenPedido } from '../../../domain/enums';
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { ListPedidosQueryDto } from '../../dto/pedido-dtos/list-pedidos-query.dto';
import { GetPedidoByIdUseCase } from './get-pedido-by-id.use-case';
import { ListPedidosUseCase } from './list-pedidos.use-case';

describe('Consultas de pedidos', () => {
  const findMany = jest.fn();
  const findDetalleById = jest.fn();

  const pedidoRepository = {
    findMany,
    findDetalleById,
  } as unknown as jest.Mocked<PedidoRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ListPedidosUseCase', () => {
    const useCase = new ListPedidosUseCase(pedidoRepository);

    it('pasa los filtros y convierte las fechas al rango de Lima', async () => {
      const query = Object.assign(new ListPedidosQueryDto(), {
        page: 2,
        limit: 20,
        estado: EstadoPedido.CONFIRMADO,
        origen: OrigenPedido.MANUAL,
        fecha_desde: '2026-10-01',
        fecha_hasta: '2026-10-31',
      });

      await useCase.execute(query);

      expect(findMany).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        estado: EstadoPedido.CONFIRMADO,
        origen: OrigenPedido.MANUAL,
        desde: new Date('2026-10-01T05:00:00.000Z'),
        hasta: new Date('2026-11-01T05:00:00.000Z'),
      });
    });

    it('sin filtros lista todos los estados y orígenes', async () => {
      await useCase.execute(new ListPedidosQueryDto());

      expect(findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        estado: undefined,
        origen: undefined,
        desde: undefined,
        hasta: undefined,
      });
    });

    it('rechaza un rango de fechas invertido sin consultar', () => {
      const query = Object.assign(new ListPedidosQueryDto(), {
        fecha_desde: '2026-10-31',
        fecha_hasta: '2026-10-01',
      });

      expect(() => useCase.execute(query)).toThrow(InvalidRequestError);
      expect(findMany).not.toHaveBeenCalled();
    });
  });

  describe('GetPedidoByIdUseCase', () => {
    const useCase = new GetPedidoByIdUseCase(pedidoRepository);

    it('devuelve el detalle del pedido', async () => {
      const detalle = { pedido: { id: 7 } };
      findDetalleById.mockResolvedValue(detalle);

      await expect(useCase.execute(7)).resolves.toBe(detalle);
      expect(findDetalleById).toHaveBeenCalledWith(7);
    });

    it('falla si el pedido no existe', async () => {
      findDetalleById.mockResolvedValue(null);

      await expect(useCase.execute(99)).rejects.toThrow(ResourceNotFoundError);
    });
  });
});
