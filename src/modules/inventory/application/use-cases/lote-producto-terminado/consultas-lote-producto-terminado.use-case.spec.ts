import { LoteProductoTerminadoEntity } from '../../../domain/entities';
import { EstadoLoteProductoTerminado } from '../../../domain/enums';
import { UnidadMedidaPresentacion } from '../../../../catalog/domain/enums';
import { ResourceNotFoundError } from '../../../../catalog/domain/errors/catalog-domain.errors';
import { LoteProductoTerminadoRepository } from '../../../domain/repositories/lote-producto-terminado.repository';
import { GetLoteProductoTerminadoByIdUseCase } from './get-lote-producto-terminado-by-id.use-case';
import { ListLotesProductoTerminadoUseCase } from './list-lotes-producto-terminado.use-case';

describe('Consultas de lotes de producto terminado', () => {
  const findById = jest.fn();
  const findMany = jest.fn();
  const loteProductoTerminadoRepository = {
    findById,
    findMany,
  } as unknown as jest.Mocked<LoteProductoTerminadoRepository>;

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const lote = new LoteProductoTerminadoEntity(
    1,
    1,
    'DEMO-MOV-PT-001',
    10,
    'Chifles clásicos',
    1,
    'Chifles',
    1,
    250,
    UnidadMedidaPresentacion.GR,
    'LOTE-DEMO-PT-001',
    fecha,
    null,
    100,
    100,
    EstadoLoteProductoTerminado.ACTIVO,
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GetLoteProductoTerminadoByIdUseCase', () => {
    const useCase = new GetLoteProductoTerminadoByIdUseCase(
      loteProductoTerminadoRepository,
    );

    it('devuelve el lote', async () => {
      findById.mockResolvedValue(lote);

      await expect(useCase.execute(1)).resolves.toBe(lote);
    });

    it('lanza 404 si no existe', async () => {
      findById.mockResolvedValue(null);

      await expect(useCase.execute(99)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
    });
  });

  describe('ListLotesProductoTerminadoUseCase', () => {
    const useCase = new ListLotesProductoTerminadoUseCase(
      loteProductoTerminadoRepository,
    );

    it('pasa la paginación y los filtros al repositorio', async () => {
      const resultado = { data: [lote], total: 1, page: 2, limit: 5 };
      findMany.mockResolvedValue(resultado);

      await expect(
        useCase.execute({
          page: 2,
          limit: 5,
          search: 'LOTE',
          producto_terminado_id: 1,
          estado: EstadoLoteProductoTerminado.ACTIVO,
          activo: true,
          vence_desde: '2026-11-01',
          vence_hasta: '2026-11-30',
        }),
      ).resolves.toBe(resultado);
      expect(findMany).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'LOTE',
        producto_terminado_id: 1,
        estado: EstadoLoteProductoTerminado.ACTIVO,
        activo: true,
        vence_desde: new Date('2026-11-01'),
        vence_hasta: new Date('2026-11-30'),
      });
    });

    it('deja vence_desde/vence_hasta undefined si no se mandan', async () => {
      findMany.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });

      await useCase.execute({ page: 1, limit: 10 });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          vence_desde: undefined,
          vence_hasta: undefined,
        }),
      );
    });
  });
});
