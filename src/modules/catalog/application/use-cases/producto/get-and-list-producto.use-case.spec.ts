import { ProductoEntity } from '../../../domain/entities/producto.entity';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';
import { GetProductoByIdUseCase } from './get-producto-by-id.use-case';
import { ListProductosUseCase } from './list-producto.use-case';

describe('Consultas de producto', () => {
  const findById = jest.fn();
  const findMany = jest.fn();
  const productoRepository = {
    findById,
    findMany,
  } as unknown as ProductoRepository;

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const producto = new ProductoEntity(
    5,
    1,
    'Chifles Clásicos',
    null,
    true,
    false,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GetProductoByIdUseCase', () => {
    const useCase = new GetProductoByIdUseCase(productoRepository);

    it('devuelve el producto', async () => {
      findById.mockResolvedValue(producto);

      await expect(useCase.execute(5)).resolves.toBe(producto);
      expect(findById).toHaveBeenCalledWith(5);
    });

    it('lanza 404 si no existe', async () => {
      findById.mockResolvedValue(null);

      await expect(useCase.execute(99)).rejects.toThrow(
        new ResourceNotFoundError('Producto no encontrado'),
      );
    });
  });

  describe('ListProductosUseCase', () => {
    const useCase = new ListProductosUseCase(productoRepository);

    it('pasa la paginación y todos los filtros al repositorio', async () => {
      const pagina = { data: [producto], total: 1, page: 2, limit: 5 };
      findMany.mockResolvedValue(pagina);

      const resultado = await useCase.execute({
        page: 2,
        limit: 5,
        search: 'chifles',
        estado: true,
        categoria_id: 1,
        destacado: false,
      });

      expect(findMany).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'chifles',
        estado: true,
        categoria_id: 1,
        destacado: false,
      });
      expect(resultado).toBe(pagina);
    });

    it('no filtra nada cuando solo se pide la paginación', async () => {
      findMany.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });

      await useCase.execute({ page: 1, limit: 10 });

      expect(findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        estado: undefined,
        categoria_id: undefined,
        destacado: undefined,
      });
    });
  });
});
