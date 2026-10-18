import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { ListIniciativasPorObjetivoUseCase } from './list-iniciativas-por-objetivo.use-case';

describe('ListIniciativasPorObjetivoUseCase', () => {
  const findByObjetivo = jest.fn();
  const iniciativaRepository = {
    findByObjetivo,
  } as unknown as jest.Mocked<IniciativaRepository>;
  const findObjetivoActivoById = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivoById: findObjetivoActivoById,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;
  const useCase = new ListIniciativasPorObjetivoUseCase(
    iniciativaRepository,
    objetivoEstrategicoRepository,
  );
  const objetivo = {
    id: 10,
    estado: true,
  } as ObjetivoEstrategicoEntityEnriquecido;

  beforeEach(() => {
    jest.clearAllMocks();
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
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
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
    expect(findByObjetivo).toHaveBeenCalledWith({
      objetivo_estrategico_id: objetivo.id,
      page: 2,
      limit: 5,
      search: 'programa',
    });
  });
});
