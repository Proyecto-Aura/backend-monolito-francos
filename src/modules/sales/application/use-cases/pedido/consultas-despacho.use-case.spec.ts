import { EstadoPedido } from '../../../domain/enums';
import { ResourceNotFoundError } from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { ListPedidosDespachoQueryDto } from '../../dto/pedido-dtos/list-pedidos-despacho-query.dto';
import { GetPedidoDespachoUseCase } from './get-pedido-despacho.use-case';
import { ListPedidosDespachoUseCase } from './list-pedidos-despacho.use-case';

describe('Consultas de despacho', () => {
  const findMany = jest.fn();
  const findDetalleById = jest.fn();

  const pedidoRepository = {
    findMany,
    findDetalleById,
  } as unknown as jest.Mocked<PedidoRepository>;

  const ESTADOS_DE_DESPACHO = [
    EstadoPedido.PENDIENTE_ENTREGA,
    EstadoPedido.EN_CAMINO,
    EstadoPedido.ENTREGADO,
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ListPedidosDespachoUseCase', () => {
    const useCase = new ListPedidosDespachoUseCase(pedidoRepository);

    it('sin filtro limita el listado a los estados de despacho (RF-A094)', async () => {
      await useCase.execute(new ListPedidosDespachoQueryDto());

      expect(findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        estados: ESTADOS_DE_DESPACHO,
        estado: undefined,
      });
    });

    it('con estado se queda con uno de ellos', async () => {
      const query = Object.assign(new ListPedidosDespachoQueryDto(), {
        page: 2,
        limit: 20,
        estado: EstadoPedido.EN_CAMINO,
      });

      await useCase.execute(query);

      expect(findMany).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        estados: ESTADOS_DE_DESPACHO,
        estado: EstadoPedido.EN_CAMINO,
      });
    });
  });

  describe('GetPedidoDespachoUseCase', () => {
    const useCase = new GetPedidoDespachoUseCase(pedidoRepository);

    it.each(ESTADOS_DE_DESPACHO)(
      'devuelve el detalle de un pedido en %s',
      async (estado) => {
        const detalle = { pedido: { id: 7, estado } };
        findDetalleById.mockResolvedValue(detalle);

        await expect(useCase.execute(7)).resolves.toBe(detalle);
        expect(findDetalleById).toHaveBeenCalledWith(7);
      },
    );

    it.each([
      EstadoPedido.CONFIRMADO,
      EstadoPedido.EN_ESPERA_INVENTARIO,
      EstadoPedido.EN_PREPARACION,
      EstadoPedido.CANCELADO,
    ])('responde 404 para un pedido en %s (RF-A095)', async (estado) => {
      findDetalleById.mockResolvedValue({ pedido: { id: 7, estado } });

      await expect(useCase.execute(7)).rejects.toThrow(ResourceNotFoundError);
    });

    it('falla si el pedido no existe', async () => {
      findDetalleById.mockResolvedValue(null);

      await expect(useCase.execute(99)).rejects.toThrow(ResourceNotFoundError);
    });
  });
});
