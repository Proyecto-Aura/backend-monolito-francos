import { MovimientoProductoTerminadoEntity } from '../../../domain/entities';
import { TipoMovimientoProductoTerminado } from '../../../domain/enums';
import { UnidadMedidaPresentacion } from '../../../../catalog/domain/enums';
import { ResourceNotFoundError } from '../../../../catalog/domain/errors/catalog-domain.errors';
import { MovimientoProductoTerminadoRepository } from '../../../domain/repositories/movimiento-producto-terminado.repository';
import { GetMovimientoProductoTerminadoByIdUseCase } from './get-movimiento-producto-terminado-by-id.use-case';
import { ListMovimientosProductoTerminadoUseCase } from './list-movimientos-producto-terminado.use-case';

describe('Consultas de movimientos de producto terminado', () => {
  const findById = jest.fn();
  const findMany = jest.fn();
  const movimientoProductoTerminadoRepository = {
    findById,
    findMany,
  } as unknown as jest.Mocked<MovimientoProductoTerminadoRepository>;

  const fecha = new Date('2026-10-17T00:00:00.000Z');
  const movimiento = new MovimientoProductoTerminadoEntity(
    1,
    'FR-MV-001-261017-PT1',
    4,
    'LOTE-DEMO-PT-004',
    1,
    'DEMO-MOV-PT-001',
    10,
    'Chifles clásicos',
    1,
    'Chifles',
    1,
    250,
    UnidadMedidaPresentacion.GR,
    TipoMovimientoProductoTerminado.SALIDA,
    20,
    60,
    40,
    'Venta',
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GetMovimientoProductoTerminadoByIdUseCase', () => {
    const useCase = new GetMovimientoProductoTerminadoByIdUseCase(
      movimientoProductoTerminadoRepository,
    );

    it('devuelve el movimiento', async () => {
      findById.mockResolvedValue(movimiento);

      await expect(useCase.execute(1)).resolves.toBe(movimiento);
    });

    it('lanza 404 si no existe', async () => {
      findById.mockResolvedValue(null);

      await expect(useCase.execute(99)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
    });
  });

  describe('ListMovimientosProductoTerminadoUseCase', () => {
    const useCase = new ListMovimientosProductoTerminadoUseCase(
      movimientoProductoTerminadoRepository,
    );

    it('pasa la paginación y los filtros al repositorio', async () => {
      const resultado = { data: [movimiento], total: 1, page: 1, limit: 10 };
      findMany.mockResolvedValue(resultado);

      await expect(
        useCase.execute({
          page: 1,
          limit: 10,
          search: 'chifles',
          producto_terminado_id: 1,
          lote_producto_terminado_id: 4,
          tipo: TipoMovimientoProductoTerminado.SALIDA,
          fecha_desde: '2026-10-01',
          fecha_hasta: '2026-10-31',
        }),
      ).resolves.toBe(resultado);

      expect(findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'chifles',
        producto_terminado_id: 1,
        lote_producto_terminado_id: 4,
        tipo: TipoMovimientoProductoTerminado.SALIDA,
        fecha_desde: new Date('2026-10-01'),
        fecha_hasta: new Date('2026-10-31'),
      });
    });

    it('deja las fechas undefined si no se mandan', async () => {
      findMany.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });

      await useCase.execute({ page: 1, limit: 10 });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          fecha_desde: undefined,
          fecha_hasta: undefined,
        }),
      );
    });
  });
});
