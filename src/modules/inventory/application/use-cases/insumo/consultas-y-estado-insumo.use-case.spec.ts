import { InsumoEntity } from '../../../domain/entities';
import {
  NivelStockInsumo,
  TipoInsumo,
  UnidadMedidaInsumo,
} from '../../../domain/enums';
import { ResourceNotFoundError } from '../../../../catalog/domain/errors/catalog-domain.errors';
import { InsumoRepository } from '../../../domain/repositories/insumo.repository';
import { ChangeInsumoStatusUseCase } from './change-insumo-status.use-case';
import { GetInsumoByIdUseCase } from './get-insumo-by-id.use-case';
import { ListInsumosUseCase } from './list-insumos.use-case';

describe('Consultas y estado de insumos', () => {
  const findById = jest.fn();
  const findMany = jest.fn();
  const setStatus = jest.fn();
  const insumoRepository = {
    findById,
    findMany,
    setStatus,
  } as unknown as jest.Mocked<InsumoRepository>;

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const insumo = new InsumoEntity(
    1,
    'FR-INS-001',
    'Harina de trigo',
    null,
    UnidadMedidaInsumo.KG,
    20,
    10,
    200,
    TipoInsumo.MATERIA_PRIMA,
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GetInsumoByIdUseCase', () => {
    const useCase = new GetInsumoByIdUseCase(insumoRepository);

    it('devuelve el insumo', async () => {
      findById.mockResolvedValue(insumo);

      await expect(useCase.execute(1)).resolves.toBe(insumo);
    });

    it('lanza 404 si no existe', async () => {
      findById.mockResolvedValue(null);

      await expect(useCase.execute(99)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
    });
  });

  describe('ListInsumosUseCase', () => {
    const useCase = new ListInsumosUseCase(insumoRepository);

    it('pasa la paginación y los filtros al repositorio', async () => {
      const resultado = { data: [insumo], total: 1, page: 2, limit: 5 };
      findMany.mockResolvedValue(resultado);

      await expect(
        useCase.execute({
          page: 2,
          limit: 5,
          search: 'harina',
          estado: true,
          tipo: TipoInsumo.MATERIA_PRIMA,
          nivel: NivelStockInsumo.BAJO,
        }),
      ).resolves.toBe(resultado);
      expect(findMany).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'harina',
        estado: true,
        tipo: TipoInsumo.MATERIA_PRIMA,
        nivel: NivelStockInsumo.BAJO,
      });
    });
  });

  describe('ChangeInsumoStatusUseCase', () => {
    const useCase = new ChangeInsumoStatusUseCase(insumoRepository);

    it('lanza 404 si el insumo no existe', async () => {
      findById.mockResolvedValue(null);

      await expect(useCase.execute(99, false)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
      expect(setStatus).not.toHaveBeenCalled();
    });

    it('desactiva y reactiva de forma lógica', async () => {
      findById.mockResolvedValue(insumo);
      setStatus.mockImplementation((_id: number, estado: boolean) =>
        Promise.resolve({ ...insumo, estado }),
      );

      await useCase.execute(1, false);
      await useCase.execute(1, true);

      expect(setStatus).toHaveBeenNthCalledWith(1, 1, false);
      expect(setStatus).toHaveBeenNthCalledWith(2, 1, true);
    });
  });
});
