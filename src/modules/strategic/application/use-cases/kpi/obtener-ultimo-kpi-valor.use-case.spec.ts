import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { KpiValorRepository } from '../../../domain/repositories/kpi-valor.repository';
import { KpiEntityEnriquecido } from '../../../domain/repositories/types/kpi-repository.types';
import { KpiValorEntityEnriquecido } from '../../../domain/repositories/types/kpi-valor-repository.types';
import { ObtenerUltimoKpiValorUseCase } from './obtener-ultimo-kpi-valor.use-case';

describe('ObtenerUltimoKpiValorUseCase', () => {
  const findKpiById = jest.fn();
  const kpiRepository = {
    findById: findKpiById,
  } as unknown as jest.Mocked<KpiRepository>;
  const findUltimoByKpi = jest.fn();
  const kpiValorRepository = {
    findUltimoByKpi,
  } as unknown as jest.Mocked<KpiValorRepository>;
  const useCase = new ObtenerUltimoKpiValorUseCase(
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
      expect(findUltimoByKpi).not.toHaveBeenCalled();
    },
  );

  it('retorna correctamente el último valor del KPI', async () => {
    const ultimo = { id: 1 } as KpiValorEntityEnriquecido;
    findKpiById.mockResolvedValue(kpi);
    findUltimoByKpi.mockResolvedValue(ultimo);
    await expect(useCase.execute(kpi.id)).resolves.toBe(ultimo);
    expect(findUltimoByKpi).toHaveBeenCalledWith(kpi.id);
  });

  it('retorna null si el KPI no tiene registros', async () => {
    findKpiById.mockResolvedValue(kpi);
    findUltimoByKpi.mockResolvedValue(null);
    await expect(useCase.execute(kpi.id)).resolves.toBeNull();
    expect(findUltimoByKpi).toHaveBeenCalledWith(kpi.id);
  });
});
