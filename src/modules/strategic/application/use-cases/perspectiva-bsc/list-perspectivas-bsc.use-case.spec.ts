import { PerspectivaBscEntity } from '../../../domain/entities';
import { PerspectivaBscRepository } from '../../../domain/repositories/perspectiva-bsc.repository';
import { ListPerspectivasBscUseCase } from './list-perspectivas-bsc.use-case';

describe('ListPerspectivasBscUseCase', () => {
  const findAll = jest.fn();
  const repository = {
    findAll,
  } as unknown as jest.Mocked<PerspectivaBscRepository>;
  const useCase = new ListPerspectivasBscUseCase(repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve todas las perspectivas activas ordenadas por el repositorio', async () => {
    const perspectivas = [
      new PerspectivaBscEntity(1, 'Financiera', null, 1, true),
      new PerspectivaBscEntity(2, 'Cliente', null, 2, true),
    ];
    findAll.mockResolvedValue(perspectivas);

    await expect(useCase.execute()).resolves.toBe(perspectivas);
    expect(findAll).toHaveBeenCalledWith();
  });
});
