import { ProductoPresentacionEntity } from '../../../domain/entities';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { ProductoTerminadoRepository } from '../../../domain/repositories/producto-terminado.repository';
import { ChangeProductoPresentacionStatusUseCase } from './change-producto_presentacion-status.use-case';

describe('ChangeProductoPresentacionStatusUseCase', () => {
  const findById = jest.fn();
  const setStatus = jest.fn();
  const existsConStockByProductoPresentacion = jest.fn();

  const productoPresentacionRepository = {
    findById,
    setStatus,
  } as unknown as jest.Mocked<ProductoPresentacionRepository>;
  const productoTerminadoRepository = {
    existsConStockByProductoPresentacion,
  } as unknown as jest.Mocked<ProductoTerminadoRepository>;

  const useCase = new ChangeProductoPresentacionStatusUseCase(
    productoPresentacionRepository,
    productoTerminadoRepository,
  );

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const productoPresentacion = new ProductoPresentacionEntity(
    10,
    'FR-P5-PR2',
    18,
    15,
    6,
    5,
    2,
    null,
    'chifles-clasicos-200-gr-p2',
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findById.mockResolvedValue(productoPresentacion);
    existsConStockByProductoPresentacion.mockResolvedValue(false);
    setStatus.mockImplementation((_id: number, estado: boolean) =>
      Promise.resolve({ ...productoPresentacion, estado }),
    );
  });

  it('lanza 404 si la presentación del producto no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(10, false)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('desactiva la presentación si no tiene stock', async () => {
    await useCase.execute(10, false);

    expect(existsConStockByProductoPresentacion).toHaveBeenCalledWith(10);
    expect(setStatus).toHaveBeenCalledWith(10, false);
  });

  it('lanza 409 y no desactiva si todavía tiene stock', async () => {
    existsConStockByProductoPresentacion.mockResolvedValue(true);

    await expect(useCase.execute(10, false)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('reactivar no revisa el stock', async () => {
    existsConStockByProductoPresentacion.mockResolvedValue(true);

    await useCase.execute(10, true);

    expect(existsConStockByProductoPresentacion).not.toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith(10, true);
  });
});
