import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { CatalogoPublicoRepository } from '../../../domain/repositories/catalogo-publico.repository';
import { OrdenCatalogoPublico } from '../../../domain/repositories/types/catalogo-publico-repository.types';
import { GetProductoPublicoUseCase } from './get-producto-publico.use-case';
import { ListCatalogoPublicoUseCase } from './list-catalogo-publico.use-case';

describe('Catálogo público (use cases)', () => {
  const findItems = jest.fn();
  const findProducto = jest.fn();
  const catalogoPublicoRepository = {
    findItems,
    findProducto,
  } as unknown as jest.Mocked<CatalogoPublicoRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // 22:00 del 8 de octubre en Lima ya es el 9 en UTC.
    jest.setSystemTime(new Date('2026-10-09T03:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('ListCatalogoPublicoUseCase', () => {
    const useCase = new ListCatalogoPublicoUseCase(catalogoPublicoRepository);

    it('pasa solo los filtros que elige el cliente y el día de Lima', async () => {
      const resultado = { data: [], total: 0, page: 2, limit: 5 };
      findItems.mockResolvedValue(resultado);

      await expect(
        useCase.execute({
          page: 2,
          limit: 5,
          q: 'chifles',
          categoria_id: 3,
          orden: OrdenCatalogoPublico.PRECIO_DESC,
        }),
      ).resolves.toBe(resultado);

      // Sin estado ni visible_portal_b: la visibilidad la fija el repositorio.
      expect(findItems).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        q: 'chifles',
        categoria_id: 3,
        orden: OrdenCatalogoPublico.PRECIO_DESC,
        fecha_referencia: new Date('2026-10-08T00:00:00.000Z'),
      });
    });
  });

  describe('GetProductoPublicoUseCase', () => {
    const useCase = new GetProductoPublicoUseCase(catalogoPublicoRepository);

    it('devuelve el producto visible con el día de Lima', async () => {
      const producto = { id: 7, presentaciones: [{ id: 1 }] };
      findProducto.mockResolvedValue(producto);

      await expect(useCase.execute(7)).resolves.toBe(producto);
      expect(findProducto).toHaveBeenCalledWith(
        7,
        new Date('2026-10-08T00:00:00.000Z'),
      );
    });

    it('lanza 404 si el producto no existe o no es visible', async () => {
      findProducto.mockResolvedValue(null);

      await expect(useCase.execute(99)).rejects.toThrow(ResourceNotFoundError);
    });
  });
});
