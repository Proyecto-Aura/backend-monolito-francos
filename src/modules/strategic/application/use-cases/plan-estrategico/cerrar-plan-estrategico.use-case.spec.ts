import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { EstadoPlanEstrategicoRepository } from '../../../domain/repositories/estado-plan-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { CerrarPlanEstrategicoUseCase } from './cerrar-plan-estrategico.use-case';

describe('CerrarPlanEstrategicoUseCase', () => {
  const findActivoById = jest.fn();
  const updateEstado = jest.fn();
  const findByCodigo = jest.fn();
  const planRepository = {
    findActivoById,
    updateEstado,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const estadoRepository = {
    findByCodigo,
  } as unknown as jest.Mocked<EstadoPlanEstrategicoRepository>;
  const useCase = new CerrarPlanEstrategicoUseCase(
    planRepository,
    estadoRepository,
  );

  const createPlan = (
    codigoEstado: string,
  ): PlanEstrategicoEntityConEstado => ({
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan Estratégico 2026',
    descripcion: null,
    anio_inicio: 2026,
    anio_fin: 2030,
    estado_plan_id: codigoEstado === 'ACTIVO' ? 2 : 1,
    estado: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    estado_plan: {
      id: codigoEstado === 'ACTIVO' ? 2 : 1,
      codigo: codigoEstado,
      nombre: codigoEstado,
      orden: codigoEstado === 'ACTIVO' ? 2 : 1,
      estado: true,
    },
  });

  const estadoCerrado = {
    id: 3,
    codigo: 'CERRADO',
    nombre: 'Cerrado',
    orden: 3,
    estado: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cierra correctamente un plan activo', async () => {
    const planActivo = createPlan('ACTIVO');
    const planCerrado = createPlan('CERRADO');
    findActivoById.mockResolvedValue(planActivo);
    findByCodigo.mockResolvedValue(estadoCerrado);
    updateEstado.mockResolvedValue(planCerrado);

    await expect(useCase.execute(1)).resolves.toBe(planCerrado);
    expect(findByCodigo).toHaveBeenCalledWith('CERRADO');
    expect(updateEstado).toHaveBeenCalledWith(1, 3);
  });

  it('lanza 404 si el plan no existe', async () => {
    findActivoById.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findByCodigo).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está activo', async () => {
    findActivoById.mockResolvedValue(createPlan('BORRADOR'));

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(findByCodigo).not.toHaveBeenCalled();
  });
});
