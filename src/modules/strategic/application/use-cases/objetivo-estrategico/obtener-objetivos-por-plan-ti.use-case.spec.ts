import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { ObtenerObjetivosPorPlanTiUseCase } from './obtener-objetivos-por-plan-ti.use-case';

describe('ObtenerObjetivosPorPlanTiUseCase', () => {
  const findPlanActivoById = jest.fn();
  const planEstrategicoRepository = {
    findActivoById: findPlanActivoById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;

  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;

  const findActivosPorPlan = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivosPorPlan,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;

  const useCase = new ObtenerObjetivosPorPlanTiUseCase(
    planEstrategicoRepository,
    tipoModuloRepository,
    objetivoEstrategicoRepository,
  );

  const plan = {
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan Estratégico 2026',
    descripcion: null,
    anio_inicio: 2026,
    anio_fin: 2030,
    estado_plan_id: 1,
    estado: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    estado_plan: {
      id: 1,
      codigo: 'BORRADOR',
      nombre: 'Borrador',
      orden: 1,
      estado: true,
    },
  } as PlanEstrategicoEntityConEstado;

  const tipoModulo = {
    id: 7,
    codigo: 'TI',
    nombre: 'TI',
    estado: true,
  };

  const objetivos = [];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lanza 404 si el plan no existe o está eliminado lógicamente', async () => {
    findPlanActivoById.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(findTipoModuloByCodigo).not.toHaveBeenCalled();
    expect(findActivosPorPlan).not.toHaveBeenCalled();
  });

  it('lanza 404 si el tipo de módulo no existe', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findTipoModuloByCodigo.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(findActivosPorPlan).not.toHaveBeenCalled();
  });

  it('devuelve el plan y sus objetivos activos de TI', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findActivosPorPlan.mockResolvedValue(objetivos);

    await expect(useCase.execute(1)).resolves.toEqual({ plan, objetivos });

    expect(findActivosPorPlan).toHaveBeenCalledWith(plan.id, tipoModulo.id);
  });
});
