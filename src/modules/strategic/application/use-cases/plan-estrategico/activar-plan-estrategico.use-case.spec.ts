import { Prisma } from '@prisma/client';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { EstadoPlanEstrategicoRepository } from '../../../domain/repositories/estado-plan-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { ActivarPlanEstrategicoUseCase } from './activar-plan-estrategico.use-case';

describe('ActivarPlanEstrategicoUseCase', () => {
  const findById = jest.fn();
  const updateEstado = jest.fn();
  const findByCodigo = jest.fn();
  const planRepository = {
    findById,
    updateEstado,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const estadoRepository = {
    findByCodigo,
  } as unknown as jest.Mocked<EstadoPlanEstrategicoRepository>;
  const useCase = new ActivarPlanEstrategicoUseCase(
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
    estado_plan_id: codigoEstado === 'BORRADOR' ? 1 : 2,
    estado: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    estado_plan: {
      id: codigoEstado === 'BORRADOR' ? 1 : 2,
      codigo: codigoEstado,
      nombre: codigoEstado,
      orden: codigoEstado === 'BORRADOR' ? 1 : 2,
      estado: true,
    },
  });

  const estadoActivo = {
    id: 2,
    codigo: 'ACTIVO',
    nombre: 'Activo',
    orden: 2,
    estado: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('activa correctamente un plan en borrador', async () => {
    const planBorrador = createPlan('BORRADOR');
    const planActivo = createPlan('ACTIVO');
    findById.mockResolvedValue(planBorrador);
    findByCodigo.mockResolvedValue(estadoActivo);
    updateEstado.mockResolvedValue(planActivo);

    await expect(useCase.execute(1)).resolves.toBe(planActivo);
    expect(findByCodigo).toHaveBeenCalledWith('ACTIVO');
    expect(updateEstado).toHaveBeenCalledWith(1, 2);
  });

  it('lanza 404 si el plan no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findByCodigo).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está en borrador', async () => {
    findById.mockResolvedValue(createPlan('ACTIVO'));

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(findByCodigo).not.toHaveBeenCalled();
  });

  it('traduce P2002 a un conflicto con mensaje amigable', async () => {
    findById.mockResolvedValue(createPlan('BORRADOR'));
    findByCodigo.mockResolvedValue(estadoActivo);
    updateEstado.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('msg', {
        code: 'P2002',
        clientVersion: '7.8.0',
      }),
    );

    const execution = useCase.execute(1);

    await expect(execution).rejects.toBeInstanceOf(ResourceConflictError);
    await expect(execution).rejects.toThrow(
      'Ya existe un plan activo. Cierra el plan activo actual antes de activar uno nuevo.',
    );
  });
});
