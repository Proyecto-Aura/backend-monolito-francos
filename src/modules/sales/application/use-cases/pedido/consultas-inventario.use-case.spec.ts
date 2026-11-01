import { EstadoPedido } from '../../../domain/enums';
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { EstadoDeInventario } from '../../../domain/rules/transiciones-pedido';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { ListPedidosInventarioQueryDto } from '../../dto/pedido-dtos/list-pedidos-inventario-query.dto';
import { GetIndicadoresPedidosInventarioUseCase } from './get-indicadores-pedidos-inventario.use-case';
import { GetPedidoInventarioUseCase } from './get-pedido-inventario.use-case';
import { ListPedidosInventarioUseCase } from './list-pedidos-inventario.use-case';

describe('Consultas de pedidos de inventario OFT0-260', () => {
  const findMany = jest.fn();
  const findDetalleById = jest.fn();
  const getIndicadoresInventario = jest.fn();
  const repository = {
    findMany,
    findDetalleById,
    getIndicadoresInventario,
  } as unknown as PedidoRepository;
  const estados: EstadoDeInventario[] = [
    EstadoPedido.EN_ESPERA_INVENTARIO,
    EstadoPedido.EN_PREPARACION,
    EstadoPedido.PENDIENTE_ENTREGA,
  ];

  beforeEach(() => jest.resetAllMocks());

  describe('ListPedidosInventarioUseCase', () => {
    const useCase = new ListPedidosInventarioUseCase(repository);

    it('limita el listado a inventario y conserva la paginación por defecto', async () => {
      const resultado = { data: [], total: 0, page: 1, limit: 10 };
      findMany.mockResolvedValue(resultado);
      await expect(
        useCase.execute(new ListPedidosInventarioQueryDto()),
      ).resolves.toBe(resultado);
      expect(findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        estados,
        estado: undefined,
        search: undefined,
        desde: undefined,
        hasta: undefined,
      });
    });

    it.each(estados)(
      'propaga el filtro %s, búsqueda y día de Lima sin perder el alcance',
      async (estado) => {
        await useCase.execute({
          page: 2,
          limit: 5,
          estado,
          search: 'cliente',
          fecha: '2026-10-31',
        });
        expect(findMany).toHaveBeenCalledWith({
          page: 2,
          limit: 5,
          estados,
          estado,
          search: 'cliente',
          desde: new Date('2026-10-31T05:00:00Z'),
          hasta: new Date('2026-11-01T05:00:00Z'),
        });
      },
    );
  });

  describe('Rangos de fechas en ListPedidosInventarioUseCase', () => {
    const useCase = new ListPedidosInventarioUseCase(repository);

    it.each([
      {
        nombre: 'rango completo',
        query: { fecha_desde: '2026-10-30', fecha_hasta: '2026-11-02' },
        desde: '2026-10-30T05:00:00Z',
        hasta: '2026-11-03T05:00:00Z',
      },
      {
        nombre: 'mismo día',
        query: { fecha_desde: '2026-11-01', fecha_hasta: '2026-11-01' },
        desde: '2026-11-01T05:00:00Z',
        hasta: '2026-11-02T05:00:00Z',
      },
      {
        nombre: 'solo desde',
        query: { fecha_desde: '2026-11-01' },
        desde: '2026-11-01T05:00:00Z',
        hasta: undefined,
      },
      {
        nombre: 'solo hasta',
        query: { fecha_hasta: '2026-11-01' },
        desde: undefined,
        hasta: '2026-11-02T05:00:00Z',
      },
      {
        nombre: 'rango tiene prioridad sobre fecha',
        query: {
          fecha: '2025-01-01',
          fecha_desde: '2026-10-30',
          fecha_hasta: '2026-11-02',
        },
        desde: '2026-10-30T05:00:00Z',
        hasta: '2026-11-03T05:00:00Z',
      },
      {
        nombre: 'desde reemplaza solo su extremo',
        query: { fecha: '2026-11-01', fecha_desde: '2026-10-30' },
        desde: '2026-10-30T05:00:00Z',
        hasta: '2026-11-02T05:00:00Z',
      },
      {
        nombre: 'hasta reemplaza solo su extremo',
        query: { fecha: '2026-11-01', fecha_hasta: '2026-11-02' },
        desde: '2026-11-01T05:00:00Z',
        hasta: '2026-11-03T05:00:00Z',
      },
    ])('$nombre', async ({ query, desde, hasta }) => {
      await useCase.execute({
        page: 2,
        limit: 5,
        estado: EstadoPedido.EN_PREPARACION,
        search: 'pedido',
        ...query,
      });
      expect(findMany).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        estados,
        estado: EstadoPedido.EN_PREPARACION,
        search: 'pedido',
        desde: desde ? new Date(desde) : undefined,
        hasta: hasta ? new Date(hasta) : undefined,
      });
    });

    it('rechaza un rango invertido sin consultar el repositorio', () => {
      expect(() =>
        useCase.execute({
          page: 1,
          limit: 10,
          fecha_desde: '2026-11-02',
          fecha_hasta: '2026-11-01',
        }),
      ).toThrow(InvalidRequestError);
      expect(findMany).not.toHaveBeenCalled();
    });
  });

  describe('GetPedidoInventarioUseCase', () => {
    const useCase = new GetPedidoInventarioUseCase(repository);

    it.each(estados)(
      'devuelve el detalle de un pedido en %s',
      async (estado) => {
        const detalle = { pedido: { id: 7, estado } };
        findDetalleById.mockResolvedValue(detalle);
        await expect(useCase.execute(7)).resolves.toBe(detalle);
        expect(findDetalleById).toHaveBeenCalledWith(7);
      },
    );

    it.each(
      Object.values(EstadoPedido).filter(
        (estado) => !(estados as readonly EstadoPedido[]).includes(estado),
      ),
    )('oculta con 404 un pedido en %s', async (estado) => {
      findDetalleById.mockResolvedValue({ pedido: { id: 7, estado } });
      await expect(useCase.execute(7)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
    });

    it('devuelve 404 cuando el pedido no existe', async () => {
      findDetalleById.mockResolvedValue(null);
      await expect(useCase.execute(99)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
    });
  });

  describe('GetIndicadoresPedidosInventarioUseCase', () => {
    it('devuelve los tres conteos del repositorio sin transformarlos', async () => {
      const indicadores = {
        en_espera_inventario: 2,
        en_preparacion: 3,
        pendiente_entrega: 4,
      };
      getIndicadoresInventario.mockResolvedValue(indicadores);
      await expect(
        new GetIndicadoresPedidosInventarioUseCase(repository).execute(),
      ).resolves.toBe(indicadores);
      expect(getIndicadoresInventario).toHaveBeenCalledTimes(1);
      expect(getIndicadoresInventario).toHaveBeenCalledWith();
    });
  });
});
