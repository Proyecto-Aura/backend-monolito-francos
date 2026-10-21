import { MovimientoInsumoEntity } from '../../../domain/entities';
import { TipoMovimientoInsumo } from '../../../domain/enums';
import { ResourceNotFoundError } from '../../../../catalog/domain/errors/catalog-domain.errors';
import { MovimientoInsumoRepository } from '../../../domain/repositories/movimiento-insumo.repository';
import { GetMovimientoByIdUseCase } from './get-movimiento-by-id.use-case';
import { ListMovimientosUseCase } from './list-movimientos.use-case';

describe('Consultas de movimientos de insumo', () => {
  const findById = jest.fn();
  const findMany = jest.fn();
  const movimientoInsumoRepository = {
    findById,
    findMany,
  } as unknown as jest.Mocked<MovimientoInsumoRepository>;

  const fecha = new Date('2026-10-17T00:00:00.000Z');
  const movimiento = new MovimientoInsumoEntity(
    1,
    4,
    TipoMovimientoInsumo.SALIDA,
    20,
    60,
    40,
    'Consumo en producción',
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GetMovimientoByIdUseCase', () => {
    const useCase = new GetMovimientoByIdUseCase(movimientoInsumoRepository);

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

  describe('ListMovimientosUseCase', () => {
    const useCase = new ListMovimientosUseCase(movimientoInsumoRepository);

    it('pasa la paginación y los filtros al repositorio', async () => {
      const resultado = { data: [movimiento], total: 1, page: 1, limit: 10 };
      findMany.mockResolvedValue(resultado);

      await expect(
        useCase.execute({
          page: 1,
          limit: 10,
          insumo_id: 1,
          lote_insumo_id: 4,
          tipo: TipoMovimientoInsumo.SALIDA,
          fecha_desde: '2026-10-01',
          fecha_hasta: '2026-10-31',
        }),
      ).resolves.toBe(resultado);

      expect(findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        insumo_id: 1,
        lote_insumo_id: 4,
        tipo: TipoMovimientoInsumo.SALIDA,
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
