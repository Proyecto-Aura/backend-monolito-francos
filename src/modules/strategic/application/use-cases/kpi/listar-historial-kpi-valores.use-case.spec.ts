import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { KpiValorRepository } from '../../../domain/repositories/kpi-valor.repository';
import { KpiEntityEnriquecido } from '../../../domain/repositories/types/kpi-repository.types';
import { KpiValorEntityEnriquecido } from '../../../domain/repositories/types/kpi-valor-repository.types';
import { ListarHistorialKpiValoresUseCase } from './listar-historial-kpi-valores.use-case';

describe('ListarHistorialKpiValoresUseCase', () => {
  const findKpiById = jest.fn();
  const kpiRepository = {
    findById: findKpiById,
  } as unknown as jest.Mocked<KpiRepository>;
  const findHistorialByKpi = jest.fn();
  const kpiValorRepository = {
    findHistorialByKpi,
  } as unknown as jest.Mocked<KpiValorRepository>;
  const useCase = new ListarHistorialKpiValoresUseCase(
    kpiRepository,
    kpiValorRepository,
  );
  const kpi = { id: 20, estado: true } as KpiEntityEnriquecido;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([null, { ...kpi, estado: false }])(
    'lanza 404 si el KPI no existe o está inactivo',
    async (resultado) => {
      findKpiById.mockResolvedValue(resultado);
      await expect(useCase.execute(kpi.id)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
      expect(findHistorialByKpi).not.toHaveBeenCalled();
    },
  );

  it('retorna correctamente el historial del KPI', async () => {
    const historial = [{ id: 1 }] as KpiValorEntityEnriquecido[];
    findKpiById.mockResolvedValue(kpi);
    findHistorialByKpi.mockResolvedValue(historial);
    await expect(useCase.execute(kpi.id)).resolves.toBe(historial);
    expect(findHistorialByKpi).toHaveBeenCalledWith(kpi.id);
  });
});
