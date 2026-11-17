import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { ObtenerIniciativasPorPlanTiUseCase } from './obtener-iniciativas-por-plan-ti.use-case';

describe('ObtenerIniciativasPorPlanTiUseCase', () => {
  const findPlanActivoById = jest.fn();
  const planEstrategicoRepository = {
    findActivoById: findPlanActivoById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;
  const findResumenPorPlan = jest.fn();
  const iniciativaRepository = {
    findResumenPorPlan,
  } as unknown as jest.Mocked<IniciativaRepository>;
  const tipoModuloTi = { id: 8, codigo: 'TI', estado: true };
  const useCase = new ObtenerIniciativasPorPlanTiUseCase(
    planEstrategicoRepository,
    tipoModuloRepository,
    iniciativaRepository,
  );
  const plan = { id: 1, estado: true } as PlanEstrategicoEntityConEstado;

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

  it('obtiene el resumen de iniciativas del plan y tipo TI', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findTipoModuloByCodigo.mockResolvedValue(tipoModuloTi);
    const resultado = [];
    findResumenPorPlan.mockResolvedValue(resultado);

    await expect(useCase.execute(plan.id)).resolves.toBe(resultado);
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(findResumenPorPlan).toHaveBeenCalledWith(plan.id, tipoModuloTi.id);
  });
});
