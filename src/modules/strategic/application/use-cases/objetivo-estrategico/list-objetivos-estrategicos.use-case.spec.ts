import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ListObjetivosEstrategicosUseCase } from './list-objetivos-estrategicos.use-case';

describe('ListObjetivosEstrategicosUseCase', () => {
  const findMany = jest.fn();
  const objetivoEstrategicoRepository = {
    findMany,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;
  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;
  const useCase = new ListObjetivosEstrategicosUseCase(
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

    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('NEG');
    expect(findMany).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      plan_estrategico_id: 1,
      tipo_modulo_id: tipoModulo.id,
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
      tipo_modulo_id: tipoModulo.id,
      perspectiva_bsc_id: undefined,
      search: undefined,
    });
  });

  it('lanza 404 si el tipo de módulo NEG no existe', async () => {
    findTipoModuloByCodigo.mockResolvedValue(null);

    await expect(
      useCase.execute({ page: 1, limit: 10, plan_estrategico_id: 1 }),
    ).rejects.toThrow('Tipo de módulo NEG no encontrado');
    expect(findMany).not.toHaveBeenCalled();
  });
});
