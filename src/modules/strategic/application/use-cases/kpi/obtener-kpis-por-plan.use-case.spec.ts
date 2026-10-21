import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { KpiResumenPlanEntidad } from '../../../domain/repositories/types/kpi-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { ObtenerKpisPorPlanUseCase } from './obtener-kpis-por-plan.use-case';

describe('ObtenerKpisPorPlanUseCase', () => {
  const findPlanActivoById = jest.fn();
  const planEstrategicoRepository = {
    findActivoById: findPlanActivoById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;
  const findResumenPorPlan = jest.fn();
  const kpiRepository = {
    findResumenPorPlan,
  } as unknown as jest.Mocked<KpiRepository>;
  const useCase = new ObtenerKpisPorPlanUseCase(
    planEstrategicoRepository,
    tipoModuloRepository,
    kpiRepository,
  );
  const plan = { id: 1, estado: true } as PlanEstrategicoEntityConEstado;
  const tipoModulo = { id: 7, codigo: 'NEG', estado: true };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lanza 404 si el plan no existe', async () => {
    findPlanActivoById.mockResolvedValue(null);
    await expect(useCase.execute(plan.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findTipoModuloByCodigo).not.toHaveBeenCalled();
    expect(findResumenPorPlan).not.toHaveBeenCalled();
  });

  it('lanza 404 si el tipo de módulo no existe', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findTipoModuloByCodigo.mockResolvedValue(null);
    await expect(useCase.execute(plan.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findResumenPorPlan).not.toHaveBeenCalled();
  });

  it('retorna correctamente el resumen de KPIs del plan', async () => {
    const resumen = [{ id: 20 }] as KpiResumenPlanEntidad[];
    findPlanActivoById.mockResolvedValue(plan);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findResumenPorPlan.mockResolvedValue(resumen);
    await expect(useCase.execute(plan.id)).resolves.toBe(resumen);
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('NEG');
    expect(findResumenPorPlan).toHaveBeenCalledWith(plan.id, tipoModulo.id);
  });
});
