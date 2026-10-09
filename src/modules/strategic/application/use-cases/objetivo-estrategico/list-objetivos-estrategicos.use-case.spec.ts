import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { ListObjetivosEstrategicosUseCase } from './list-objetivos-estrategicos.use-case';

describe('ListObjetivosEstrategicosUseCase', () => {
  const findMany = jest.fn();
  const objetivoEstrategicoRepository = {
    findMany,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;
  const useCase = new ListObjetivosEstrategicosUseCase(
    objetivoEstrategicoRepository,
  );

  const resultado = {
    data: [],
    total: 0,
    page: 1,
    limit: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mapea todos los campos del dto a findMany y devuelve el resultado sin transformarlo', async () => {
    findMany.mockResolvedValue(resultado);

    await expect(
      useCase.execute({
        page: 2,
        limit: 5,
        plan_estrategico_id: 1,
        perspectiva_bsc_id: 2,
        search: 'rentabilidad',
      }),
    ).resolves.toBe(resultado);

    expect(findMany).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      plan_estrategico_id: 1,
      perspectiva_bsc_id: 2,
      search: 'rentabilidad',
    });
  });

  it('conserva perspectiva_bsc_id y search como undefined cuando no vienen en el dto', async () => {
    findMany.mockResolvedValue(resultado);

    await expect(
      useCase.execute({
        page: 1,
        limit: 10,
        plan_estrategico_id: 1,
      }),
    ).resolves.toBe(resultado);

    expect(findMany).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      plan_estrategico_id: 1,
      perspectiva_bsc_id: undefined,
      search: undefined,
    });
  });
});
