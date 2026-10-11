import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { ListTodosObjetivosEstrategicosUseCase } from './list-todos-objetivos-estrategicos.use-case';

describe('ListTodosObjetivosEstrategicosUseCase', () => {
  const findManyIncluyendoInactivos = jest.fn();
  const findMany = jest.fn();
  const objetivoEstrategicoRepository = {
    findManyIncluyendoInactivos,
    findMany,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;
  const useCase = new ListTodosObjetivosEstrategicosUseCase(
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

  it('llama findManyIncluyendoInactivos con el dto mapeado y devuelve el resultado tal cual', async () => {
    findManyIncluyendoInactivos.mockResolvedValue(resultado);

    await expect(
      useCase.execute({
        page: 2,
        limit: 5,
        plan_estrategico_id: 1,
        perspectiva_bsc_id: 2,
        search: 'rentabilidad',
      }),
    ).resolves.toBe(resultado);

    expect(findManyIncluyendoInactivos).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      plan_estrategico_id: 1,
      perspectiva_bsc_id: 2,
      search: 'rentabilidad',
    });
    expect(findMany).not.toHaveBeenCalled();
  });
});
