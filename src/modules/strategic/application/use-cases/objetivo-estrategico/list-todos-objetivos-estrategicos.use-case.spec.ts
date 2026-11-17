import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ListTodosObjetivosEstrategicosUseCase } from './list-todos-objetivos-estrategicos.use-case';

describe('ListTodosObjetivosEstrategicosUseCase', () => {
  const findManyIncluyendoInactivos = jest.fn();
  const findMany = jest.fn();
  const objetivoEstrategicoRepository = {
    findManyIncluyendoInactivos,
    findMany,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;
  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;
  const useCase = new ListTodosObjetivosEstrategicosUseCase(
    objetivoEstrategicoRepository,
    tipoModuloRepository,
  );

  const tipoModulo = { id: 7, codigo: 'NEG', estado: true };
  const resultado = {
    data: [],
    total: 0,
    page: 1,
    limit: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
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

    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('NEG');
    expect(findManyIncluyendoInactivos).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      plan_estrategico_id: 1,
      tipo_modulo_id: tipoModulo.id,
      perspectiva_bsc_id: 2,
      search: 'rentabilidad',
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('lanza 404 si el tipo de módulo NEG no existe', async () => {
    findTipoModuloByCodigo.mockResolvedValue(null);

    await expect(
      useCase.execute({ page: 1, limit: 10, plan_estrategico_id: 1 }),
    ).rejects.toThrow('Tipo de módulo NEG no encontrado');
    expect(findManyIncluyendoInactivos).not.toHaveBeenCalled();
  });
});
