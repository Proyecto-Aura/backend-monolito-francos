import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { KpiEntityEnriquecido } from '../../../domain/repositories/types/kpi-repository.types';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { ListKpisPorObjetivoUseCase } from './list-kpis-por-objetivo.use-case';

describe('ListKpisPorObjetivoUseCase', () => {
  const findByObjetivo = jest.fn();
  const kpiRepository = {
    findByObjetivo,
  } as unknown as jest.Mocked<KpiRepository>;
  const findObjetivoActivoById = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivoById: findObjetivoActivoById,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;
  const useCase = new ListKpisPorObjetivoUseCase(
    kpiRepository,
    objetivoEstrategicoRepository,
  );
  const objetivo = { id: 10 } as ObjetivoEstrategicoEntityEnriquecido;
  const dto = {
    objetivo_estrategico_id: objetivo.id,
    page: 2,
    limit: 5,
    search: 'margen',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lanza 404 si el objetivo no existe', async () => {
    findObjetivoActivoById.mockResolvedValue(null);
    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findByObjetivo).not.toHaveBeenCalled();
  });

  it('lista correctamente los KPIs paginados del objetivo', async () => {
    const resultado = {
      data: [{ id: 20 } as KpiEntityEnriquecido],
      total: 1,
      page: 2,
      limit: 5,
    };
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findByObjetivo.mockResolvedValue(resultado);
    await expect(useCase.execute(dto)).resolves.toBe(resultado);
    expect(findByObjetivo).toHaveBeenCalledWith({
      objetivo_estrategico_id: objetivo.id,
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
    });
  });
});
