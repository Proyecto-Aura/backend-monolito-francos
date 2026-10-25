import { ProductoEntity } from '../../../domain/entities';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';
import { ProductoTerminadoRepository } from '../../../domain/repositories/producto-terminado.repository';
import { ChangeProductoStatusUseCase } from './change-producto-status.use-case';

describe('ChangeProductoStatusUseCase', () => {
  const findById = jest.fn();
  const setStatus = jest.fn();
  const existsConStockByProducto = jest.fn();

  const productoRepository = {
    findById,
    setStatus,
  } as unknown as jest.Mocked<ProductoRepository>;
  const productoTerminadoRepository = {
    existsConStockByProducto,
  } as unknown as jest.Mocked<ProductoTerminadoRepository>;

  const useCase = new ChangeProductoStatusUseCase(
    productoRepository,
    productoTerminadoRepository,
  );

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const producto = new ProductoEntity(
    5,
    1,
    'Chifles clásicos',
    null,
    true,
    false,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findById.mockResolvedValue(producto);
    existsConStockByProducto.mockResolvedValue(false);
    setStatus.mockImplementation((_id: number, estado: boolean) =>
      Promise.resolve({ ...producto, estado }),
    );
  });

  it('lanza 404 si el producto no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(5, false)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('desactiva el producto si ninguna de sus presentaciones tiene stock', async () => {
    await useCase.execute(5, false);

    expect(existsConStockByProducto).toHaveBeenCalledWith(5);
    expect(setStatus).toHaveBeenCalledWith(5, false);
  });

  it('lanza 409 y no desactiva si alguna presentación todavía tiene stock', async () => {
    existsConStockByProducto.mockResolvedValue(true);

    await expect(useCase.execute(5, false)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('reactivar no revisa el stock', async () => {
    existsConStockByProducto.mockResolvedValue(true);

    await useCase.execute(5, true);

    expect(existsConStockByProducto).not.toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith(5, true);
  });
});
