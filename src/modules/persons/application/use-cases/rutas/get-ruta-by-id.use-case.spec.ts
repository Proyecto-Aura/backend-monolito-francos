import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { RutaEntity } from '../../../domain/entities/ruta.entity';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';
import { GetRutaByIdUseCase } from './get-ruta-by-id.use-case';

describe('GetRutaByIdUseCase', () => {
  const findById = jest.fn();
  const repository = {
    findById,
  } as unknown as jest.Mocked<RutaRepository>;
  const useCase = new GetRutaByIdUseCase(repository);

  const ruta = new RutaEntity(
    1,
    'insumos',
    'Insumos',
    'box',
    null,
    true,
    null,
    new Date('2026-01-01T00:00:00.000Z'),
    new Date('2026-01-01T00:00:00.000Z'),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve la ruta cuando existe', async () => {
    findById.mockResolvedValue(ruta);

    await expect(useCase.execute(1)).resolves.toBe(ruta);
    expect(findById).toHaveBeenCalledWith(1);
  });

  it('lanza 404 cuando la ruta no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(99)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
  });
});
