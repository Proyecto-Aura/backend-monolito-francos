import { ProductoPresentacionEntity } from '../../../domain/entities/producto_presentacion.entity';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { GetProductoPresentacionUseCase } from './get-producto_presentacion.use-case';

describe('GetProductoPresentacionUseCase', () => {
  const findById = jest.fn();
  const useCase = new GetProductoPresentacionUseCase({
    findById,
  } as unknown as ProductoPresentacionRepository);

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const presentacion = new ProductoPresentacionEntity(
    7,
    'FR-P1-PR2',
    10,
    null,
    null,
    1,
    2,
    null,
    'chifles-p2',
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('devuelve la presentación del producto', async () => {
    findById.mockResolvedValue(presentacion);

    await expect(useCase.execute(7)).resolves.toBe(presentacion);
    expect(findById).toHaveBeenCalledWith(7);
  });

  it('lanza 404 si no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(99)).rejects.toThrow(
      new ResourceNotFoundError('Producto presentación no encontrada'),
    );
  });
});
