import { LoteInsumoEntity } from '../../../domain/entities';
import { EstadoLoteInsumo } from '../../../domain/enums';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { LoteInsumoRepository } from '../../../domain/repositories/lote-insumo.repository';
import { ChangeLoteInsumoStatusUseCase } from './change-lote-insumo-status.use-case';
import { GetLoteInsumoByIdUseCase } from './get-lote-insumo-by-id.use-case';
import { ListLoteInsumosUseCase } from './list-lote-insumos.use-case';

describe('Consultas y estado de lotes de insumo', () => {
  const findById = jest.fn();
  const findMany = jest.fn();
  const setActivo = jest.fn();
  const loteInsumoRepository = {
    findById,
    findMany,
    setActivo,
  } as unknown as jest.Mocked<LoteInsumoRepository>;

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const lote = new LoteInsumoEntity(
    1,
    1,
    'LOTE-2026-001',
    fecha,
    null,
    100,
    100,
    EstadoLoteInsumo.ACTIVO,
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GetLoteInsumoByIdUseCase', () => {
    const useCase = new GetLoteInsumoByIdUseCase(loteInsumoRepository);

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

  describe('ListLoteInsumosUseCase', () => {
    const useCase = new ListLoteInsumosUseCase(loteInsumoRepository);

    it('pasa la paginación y los filtros al repositorio', async () => {
      const resultado = { data: [lote], total: 1, page: 2, limit: 5 };
      findMany.mockResolvedValue(resultado);

      await expect(
        useCase.execute({
          page: 2,
          limit: 5,
          search: 'LOTE',
          insumo_id: 1,
          estado: EstadoLoteInsumo.ACTIVO,
          activo: true,
        }),
      ).resolves.toBe(resultado);
      expect(findMany).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'LOTE',
        insumo_id: 1,
        estado: EstadoLoteInsumo.ACTIVO,
        activo: true,
      });
    });
  });

  describe('ChangeLoteInsumoStatusUseCase', () => {
    const useCase = new ChangeLoteInsumoStatusUseCase(loteInsumoRepository);

    it('lanza 404 si el lote no existe', async () => {
      findById.mockResolvedValue(null);

      await expect(useCase.execute(99, false)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
      expect(setActivo).not.toHaveBeenCalled();
    });

    it('da de baja y reactiva de forma lógica', async () => {
      findById.mockResolvedValue(lote);
      setActivo.mockImplementation((_id: number, activo: boolean) =>
        Promise.resolve({ ...lote, activo }),
      );

      await useCase.execute(1, false);
      await useCase.execute(1, true);

      expect(setActivo).toHaveBeenNthCalledWith(1, 1, false);
      expect(setActivo).toHaveBeenNthCalledWith(2, 1, true);
    });
  });
});
