import { CategoriaEntity } from '../../../domain/entities';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { ChangeCategoriaStatusUseCase } from './change-categoria-status.use-case';
import { GetCategoriaByIdUseCase } from './get-categoria-by-id.use-case';
import { ListCategoriasUseCase } from './list-categorias.use-case';

describe('Consultas y estado de categorías', () => {
  const findById = jest.fn();
  const findMany = jest.fn();
  const setStatus = jest.fn();
  const categoriaRepository = {
    findById,
    findMany,
    setStatus,
  } as unknown as jest.Mocked<CategoriaRepository>;

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const categoria = new CategoriaEntity(
    1,
    'Chifles',
    'Hojuelas.',
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GetCategoriaByIdUseCase', () => {
    const useCase = new GetCategoriaByIdUseCase(categoriaRepository);

    it('devuelve la categoría', async () => {
      findById.mockResolvedValue(categoria);

      await expect(useCase.execute(1)).resolves.toBe(categoria);
    });

    it('lanza 404 si no existe', async () => {
      findById.mockResolvedValue(null);

      await expect(useCase.execute(99)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
    });
  });

  describe('ListCategoriasUseCase', () => {
    const useCase = new ListCategoriasUseCase(categoriaRepository);

    it('pasa la paginación y los filtros al repositorio', async () => {
      const resultado = { data: [categoria], total: 1, page: 2, limit: 5 };
      findMany.mockResolvedValue(resultado);

      await expect(
        useCase.execute({ page: 2, limit: 5, search: 'chi', estado: true }),
      ).resolves.toBe(resultado);
      expect(findMany).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'chi',
        estado: true,
      });
    });
  });

  describe('ChangeCategoriaStatusUseCase', () => {
    const useCase = new ChangeCategoriaStatusUseCase(categoriaRepository);

    it('lanza 404 si la categoría no existe', async () => {
      findById.mockResolvedValue(null);

      await expect(useCase.execute(99, false)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
      expect(setStatus).not.toHaveBeenCalled();
    });

    it('desactiva y reactiva de forma lógica', async () => {
      findById.mockResolvedValue(categoria);
      setStatus.mockImplementation((_id: number, estado: boolean) =>
        Promise.resolve({ ...categoria, estado }),
      );

      await useCase.execute(1, false);
      await useCase.execute(1, true);

      expect(setStatus).toHaveBeenNthCalledWith(1, 1, false);
      expect(setStatus).toHaveBeenNthCalledWith(2, 1, true);
    });
  });
});
