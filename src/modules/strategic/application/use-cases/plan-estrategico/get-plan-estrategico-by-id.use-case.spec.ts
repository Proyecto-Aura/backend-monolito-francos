import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { GetPlanEstrategicoByIdUseCase } from './get-plan-estrategico-by-id.use-case';

describe('GetPlanEstrategicoByIdUseCase', () => {
  const findById = jest.fn();
  const repository = {
    findById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const useCase = new GetPlanEstrategicoByIdUseCase(repository);

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve el plan encontrado', async () => {
    findById.mockResolvedValue(plan);

    await expect(useCase.execute(1)).resolves.toBe(plan);
    expect(findById).toHaveBeenCalledWith(1);
  });

  it('lanza 404 si el plan no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
  });
});
