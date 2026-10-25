import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { ListIniciativasPorObjetivoTiUseCase } from './list-iniciativas-por-objetivo-ti.use-case';

describe('ListIniciativasPorObjetivoTiUseCase', () => {
  const findByObjetivo = jest.fn();
  const iniciativaRepository = {
    findByObjetivo,
  } as unknown as jest.Mocked<IniciativaRepository>;
  const findObjetivoActivoById = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivoById: findObjetivoActivoById,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;
  const tipoModuloTi = { id: 8, codigo: 'TI', estado: true };
  const tipoModuloNeg = { id: 7, codigo: 'NEG', estado: true };
  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;
  const useCase = new ListIniciativasPorObjetivoTiUseCase(
    iniciativaRepository,
    tipoModuloRepository,
    objetivoEstrategicoRepository,
  );
  const objetivo = {
    id: 10,
    tipo_modulo_id: tipoModuloTi.id,
    estado: true,
  } as ObjetivoEstrategicoEntityEnriquecido;

  beforeEach(() => {
    jest.clearAllMocks();
    findTipoModuloByCodigo.mockResolvedValue(tipoModuloTi);
  });

  it('lanza 404 si el objetivo no existe', async () => {
    findObjetivoActivoById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        objetivo_estrategico_id: objetivo.id,
        page: 2,
        limit: 5,
        search: 'programa',
      }),
    ).rejects.toThrow(
      new ResourceNotFoundError('Objetivo estratégico no encontrado'),
    );
    expect(findByObjetivo).not.toHaveBeenCalled();
  });

  it('lanza 404 si el objetivo es de Negocio', async () => {
    findObjetivoActivoById.mockResolvedValue({
      ...objetivo,
      tipo_modulo_id: tipoModuloNeg.id,
    });

    const resultado = useCase.execute({
      objetivo_estrategico_id: objetivo.id,
      page: 2,
      limit: 5,
      search: 'programa',
    });

    await expect(resultado).rejects.toBeInstanceOf(ResourceNotFoundError);
    await expect(resultado).rejects.toMatchObject({
      statusCode: 404,
      message: 'Objetivo estratégico no encontrado',
    });
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(findByObjetivo).not.toHaveBeenCalled();
  });

  it('lista iniciativas con los parámetros correctos', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    const resultado = { data: [], total: 0, page: 2, limit: 5 };
    findByObjetivo.mockResolvedValue(resultado);

    await expect(
      useCase.execute({
        objetivo_estrategico_id: objetivo.id,
        page: 2,
        limit: 5,
        search: 'programa',
      }),
    ).resolves.toBe(resultado);
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(findByObjetivo).toHaveBeenCalledWith({
      objetivo_estrategico_id: objetivo.id,
      page: 2,
      limit: 5,
      search: 'programa',
    });
  });
});
