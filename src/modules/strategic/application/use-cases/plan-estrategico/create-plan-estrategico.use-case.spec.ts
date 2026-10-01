import { ResourceConflictError } from '../../../domain/errors/strategic-domain.errors';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { CreatePlanEstrategicoUseCase } from './create-plan-estrategico.use-case';

describe('CreatePlanEstrategicoUseCase', () => {
  const create = jest.fn();
  const existsByName = jest.fn();
  const repository = {
    create,
    existsByName,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const useCase = new CreatePlanEstrategicoUseCase(repository);

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

  it('crea el plan y normaliza el nombre', async () => {
    existsByName.mockResolvedValue(false);
    create.mockResolvedValue(plan);

    await expect(
      useCase.execute({
        nombre: '  Plan   Estratégico 2026  ',
        anio_inicio: 2026,
        anio_fin: 2030,
      }),
    ).resolves.toBe(plan);

    expect(existsByName).toHaveBeenCalledWith('Plan Estratégico 2026');
    expect(create).toHaveBeenCalledWith({
      nombre: 'Plan Estratégico 2026',
      descripcion: null,
      anio_inicio: 2026,
      anio_fin: 2030,
    });
  });

  it('lanza 409 si el año de fin es anterior al año de inicio', async () => {
    await expect(
      useCase.execute({
        nombre: 'Plan Estratégico 2026',
        anio_inicio: 2030,
        anio_fin: 2026,
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(existsByName).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si el nombre ya está registrado', async () => {
    existsByName.mockResolvedValue(true);

    await expect(
      useCase.execute({
        nombre: 'Plan Estratégico 2026',
        anio_inicio: 2026,
        anio_fin: 2030,
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(create).not.toHaveBeenCalled();
  });
});
