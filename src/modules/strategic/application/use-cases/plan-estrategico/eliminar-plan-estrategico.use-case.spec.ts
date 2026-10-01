import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { EliminarPlanEstrategicoUseCase } from './eliminar-plan-estrategico.use-case';

describe('EliminarPlanEstrategicoUseCase', () => {
  const findById = jest.fn();
  const setEstado = jest.fn();
  const repository = {
    findById,
    setEstado,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const useCase = new EliminarPlanEstrategicoUseCase(repository);

  const createPlan = (
    codigoEstado: string,
  ): PlanEstrategicoEntityConEstado => ({
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan Estratégico 2026',
    descripcion: null,
    anio_inicio: 2026,
    anio_fin: 2030,
    estado_plan_id:
      codigoEstado === 'BORRADOR' ? 1 : codigoEstado === 'ACTIVO' ? 2 : 3,
    estado: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    estado_plan: {
      id: codigoEstado === 'BORRADOR' ? 1 : codigoEstado === 'ACTIVO' ? 2 : 3,
      codigo: codigoEstado,
      nombre: codigoEstado,
      orden:
        codigoEstado === 'BORRADOR' ? 1 : codigoEstado === 'ACTIVO' ? 2 : 3,
      estado: true,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('elimina lógicamente un plan en borrador', async () => {
    const plan = createPlan('BORRADOR');
    const planEliminado = { ...plan, estado: false };
    findById.mockResolvedValue(plan);
    setEstado.mockResolvedValue(planEliminado);

    await expect(useCase.execute(1)).resolves.toBe(planEliminado);
    expect(setEstado).toHaveBeenCalledWith(1, false);
  });

  it('lanza 404 si el plan no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(setEstado).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan está activo', async () => {
    findById.mockResolvedValue(createPlan('ACTIVO'));

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(setEstado).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan está cerrado', async () => {
    findById.mockResolvedValue(createPlan('CERRADO'));

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(setEstado).not.toHaveBeenCalled();
  });
});
