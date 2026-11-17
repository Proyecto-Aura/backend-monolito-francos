import { PeriodoEntity, PerspectivaBscEntity } from '../../../domain/entities';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { PeriodoRepository } from '../../../domain/repositories/periodo.repository';
import { PerspectivaBscRepository } from '../../../domain/repositories/perspectiva-bsc.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { KpiSeguimientoEntidad } from '../../../domain/repositories/types/kpi-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { ObtenerSeguimientoKpisTiUseCase } from './obtener-seguimiento-kpis-ti.use-case';

describe('ObtenerSeguimientoKpisTiUseCase', () => {
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
  const findSeguimientoPorPlan = jest.fn();
  const kpiRepository = {
    findSeguimientoPorPlan,
  } as unknown as jest.Mocked<KpiRepository>;
  const findPeriodosPorFrecuencia = jest.fn();
  const periodoRepository = {
    findByFrecuencia: findPeriodosPorFrecuencia,
  } as unknown as jest.Mocked<PeriodoRepository>;
  const useCase = new ObtenerSeguimientoKpisTiUseCase(
    planEstrategicoRepository,
    perspectivaBscRepository,
    tipoModuloRepository,
    kpiRepository,
    periodoRepository,
  );
  const plan = { id: 1, estado: true } as PlanEstrategicoEntityConEstado;
  const tipoModulo = { id: 7, codigo: 'TI', estado: true };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lanza 404 si el plan no existe', async () => {
    findPlanActivoById.mockResolvedValue(null);

    await expect(useCase.execute(plan.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findSeguimientoPorPlan).not.toHaveBeenCalled();
    expect(findPeriodosPorFrecuencia).not.toHaveBeenCalled();
  });

  it('lanza 404 si el tipo de módulo TI no existe', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findPerspectivas.mockResolvedValue([]);
    findTipoModuloByCodigo.mockResolvedValue(null);

    await expect(useCase.execute(plan.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findSeguimientoPorPlan).not.toHaveBeenCalled();
    expect(findPeriodosPorFrecuencia).not.toHaveBeenCalled();
  });

  it('devuelve un mapa de periodos vacío cuando el plan no tiene KPIs', async () => {
    const perspectivas = [{ id: 1 }] as PerspectivaBscEntity[];
    findPlanActivoById.mockResolvedValue(plan);
    findPerspectivas.mockResolvedValue(perspectivas);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findSeguimientoPorPlan.mockResolvedValue([]);

    const resultado = await useCase.execute(plan.id);

    expect(resultado).toEqual({
      plan,
      perspectivas,
      kpis: [],
      periodosPorFrecuencia: new Map(),
    });
    expect(resultado.periodosPorFrecuencia.size).toBe(0);
    expect(findPeriodosPorFrecuencia).not.toHaveBeenCalled();
  });

  it('busca el tipo de módulo por código TI, no NEG', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findPerspectivas.mockResolvedValue([]);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findSeguimientoPorPlan.mockResolvedValue([]);

    await useCase.execute(plan.id);

    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(findTipoModuloByCodigo).not.toHaveBeenCalledWith('NEG');
  });

  it('consulta los periodos una vez por cada frecuencia distinta', async () => {
    const perspectivas = [{ id: 1 }] as PerspectivaBscEntity[];
    const kpis = [
      { id: 10, frecuencia: { id: 1 } },
      { id: 11, frecuencia: { id: 1 } },
      { id: 12, frecuencia: { id: 2 } },
    ] as KpiSeguimientoEntidad[];
    const periodosFrecuenciaUno = [{ id: 101 }] as PeriodoEntity[];
    const periodosFrecuenciaDos = [{ id: 201 }] as PeriodoEntity[];
    findPlanActivoById.mockResolvedValue(plan);
    findPerspectivas.mockResolvedValue(perspectivas);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findSeguimientoPorPlan.mockResolvedValue(kpis);
    findPeriodosPorFrecuencia.mockImplementation((frecuenciaId: number) =>
      Promise.resolve(
        frecuenciaId === 1 ? periodosFrecuenciaUno : periodosFrecuenciaDos,
      ),
    );

    const resultado = await useCase.execute(plan.id);

    expect(findSeguimientoPorPlan).toHaveBeenCalledWith(plan.id, tipoModulo.id);
    expect(findPeriodosPorFrecuencia).toHaveBeenCalledTimes(2);
    expect(findPeriodosPorFrecuencia).toHaveBeenCalledWith(1);
    expect(findPeriodosPorFrecuencia).toHaveBeenCalledWith(2);
    expect(resultado.plan).toBe(plan);
    expect(resultado.perspectivas).toBe(perspectivas);
    expect(resultado.kpis).toBe(kpis);
    expect(resultado.periodosPorFrecuencia).toEqual(
      new Map([
        [1, periodosFrecuenciaUno],
        [2, periodosFrecuenciaDos],
      ]),
    );
  });
});
