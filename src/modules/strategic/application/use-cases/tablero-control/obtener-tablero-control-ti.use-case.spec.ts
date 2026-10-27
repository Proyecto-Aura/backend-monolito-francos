import { PerspectivaBscEntity } from '../../../domain/entities';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { PerspectivaBscRepository } from '../../../domain/repositories/perspectiva-bsc.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { IniciativaEntityEnriquecido } from '../../../domain/repositories/types/iniciativa-repository.types';
import { KpiEntityEnriquecido } from '../../../domain/repositories/types/kpi-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { ObtenerTableroControlTiUseCase } from './obtener-tablero-control-ti.use-case';

describe('ObtenerTableroControlTiUseCase', () => {
  const findPlanActivoById = jest.fn();
  const planEstrategicoRepository = {
    findActivoById: findPlanActivoById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const findPerspectivas = jest.fn();
  const perspectivaBscRepository = {
    findAll: findPerspectivas,
  } as unknown as jest.Mocked<PerspectivaBscRepository>;
  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;
  const findKpisParaTableroControl = jest.fn();
  const kpiRepository = {
    findParaTableroControl: findKpisParaTableroControl,
  } as unknown as jest.Mocked<KpiRepository>;
  const findIniciativasResumenPorPlan = jest.fn();
  const iniciativaRepository = {
    findResumenPorPlan: findIniciativasResumenPorPlan,
  } as unknown as jest.Mocked<IniciativaRepository>;
  const useCase = new ObtenerTableroControlTiUseCase(
    planEstrategicoRepository,
    perspectivaBscRepository,
    tipoModuloRepository,
    kpiRepository,
    iniciativaRepository,
  );
  const plan = { id: 1, estado: true } as PlanEstrategicoEntityConEstado;
  const tipoModulo = { id: 8, codigo: 'TI', estado: true };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lanza 404 si el plan no existe', async () => {
    findPlanActivoById.mockResolvedValue(null);

    await expect(useCase.execute(plan.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findKpisParaTableroControl).not.toHaveBeenCalled();
    expect(findIniciativasResumenPorPlan).not.toHaveBeenCalled();
  });

  it('lanza 404 si el tipo de módulo TI no existe', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findPerspectivas.mockResolvedValue([]);
    findTipoModuloByCodigo.mockResolvedValue(null);

    await expect(useCase.execute(plan.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findKpisParaTableroControl).not.toHaveBeenCalled();
    expect(findIniciativasResumenPorPlan).not.toHaveBeenCalled();
  });

  it('busca el tipo de módulo por código TI, no NEG', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findPerspectivas.mockResolvedValue([]);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findKpisParaTableroControl.mockResolvedValue([]);
    findIniciativasResumenPorPlan.mockResolvedValue([]);

    await useCase.execute(plan.id);

    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
  });

  it('devuelve el plan, perspectivas, KPIs e iniciativas del tablero de TI', async () => {
    const perspectivas = [{ id: 3 }] as PerspectivaBscEntity[];
    const kpis = [{ id: 10 }] as KpiEntityEnriquecido[];
    const iniciativas = [{ id: 20 }] as IniciativaEntityEnriquecido[];
    findPlanActivoById.mockResolvedValue(plan);
    findPerspectivas.mockResolvedValue(perspectivas);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findKpisParaTableroControl.mockResolvedValue(kpis);
    findIniciativasResumenPorPlan.mockResolvedValue(iniciativas);

    await expect(useCase.execute(plan.id)).resolves.toEqual({
      plan,
      perspectivas,
      kpis,
      iniciativas,
    });
    expect(findKpisParaTableroControl).toHaveBeenCalledWith(
      plan.id,
      tipoModulo.id,
    );
    expect(findIniciativasResumenPorPlan).toHaveBeenCalledWith(
      plan.id,
      tipoModulo.id,
    );
  });
});
