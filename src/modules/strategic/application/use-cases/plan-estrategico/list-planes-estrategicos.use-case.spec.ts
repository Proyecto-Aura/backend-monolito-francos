import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { ListPlanesEstrategicosUseCase } from './list-planes-estrategicos.use-case';

describe('ListPlanesEstrategicosUseCase', () => {
  const findMany = jest.fn();
  const repository = {
    findMany,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const useCase = new ListPlanesEstrategicosUseCase(repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pasa los filtros y la paginación tal cual al repositorio', async () => {
    const result = {
      data: [],
      total: 0,
      page: 2,
      limit: 15,
    };
    findMany.mockResolvedValue(result);

    await expect(
      useCase.execute({
        page: 2,
        limit: 15,
        search: '2026',
        estado_codigo: 'BORRADOR',
      }),
    ).resolves.toBe(result);

    expect(findMany).toHaveBeenCalledWith({
      page: 2,
      limit: 15,
      search: '2026',
      estado_codigo: 'BORRADOR',
    });
  });
});
