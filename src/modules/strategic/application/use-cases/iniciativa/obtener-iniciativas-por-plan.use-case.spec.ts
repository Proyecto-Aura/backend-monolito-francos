import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { ObtenerIniciativasPorPlanUseCase } from './obtener-iniciativas-por-plan.use-case';

describe('ObtenerIniciativasPorPlanUseCase', () => {
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
  const useCase = new ObtenerIniciativasPorPlanUseCase(
    planEstrategicoRepository,
    tipoModuloRepository,
    iniciativaRepository,
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

  it('obtiene el resumen de iniciativas del plan y tipo NEG', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    const resultado = [];
    findResumenPorPlan.mockResolvedValue(resultado);

    await expect(useCase.execute(plan.id)).resolves.toBe(resultado);
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('NEG');
    expect(findResumenPorPlan).toHaveBeenCalledWith(plan.id, tipoModulo.id);
  });
});
