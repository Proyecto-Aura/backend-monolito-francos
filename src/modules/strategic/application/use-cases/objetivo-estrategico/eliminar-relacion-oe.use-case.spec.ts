import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { EliminarRelacionOeUseCase } from './eliminar-relacion-oe.use-case';

describe('EliminarRelacionOeUseCase', () => {
  const findObjetivoActivoById = jest.fn();
  const findRelacionById = jest.fn();
  const eliminarRelacion = jest.fn();
  const findById = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivoById: findObjetivoActivoById,
    findRelacionById,
    eliminarRelacion,
    findById,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;

  const findPlanActivoById = jest.fn();
  const planEstrategicoRepository = {
    findActivoById: findPlanActivoById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;

  const useCase = new EliminarRelacionOeUseCase(
    objetivoEstrategicoRepository,
    planEstrategicoRepository,
  );

  const objetivo = {
    id: 10,
    codigo: 'PE-0001-OE-N-001',
    plan_estrategico_id: 1,
    perspectiva_bsc_id: 1,
    tipo_modulo_id: 7,
    oe_negocio_id: null,
    estado_objetivo_id: 1,
    responsable: 'Ana Torres',
    nombre: 'Incrementar la rentabilidad',
    descripcion: null,
    estado: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    perspectiva_bsc: {
      id: 1,
      nombre: 'Financiera',
      descripcion: null,
      orden: 1,
      estado: true,
    },
    estado_objetivo: {
      id: 1,
      codigo: 'PENDIENTE',
      nombre: 'Pendiente',
      orden: 1,
      estado: true,
    },
    relaciones_como_origen: [],
  } as ObjetivoEstrategicoEntityEnriquecido;

  const relacion = {
    id: 5,
    origen_id: objetivo.id,
    destino_id: 20,
    estado: true,
  };

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

  it('lanza 404 si el objetivo no existe o está eliminado lógicamente', async () => {
    findObjetivoActivoById.mockResolvedValue(null);

    await expect(useCase.execute(10, 5)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(findRelacionById).not.toHaveBeenCalled();
    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(eliminarRelacion).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
  });

  it('lanza 404 si la relación no existe', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findRelacionById.mockResolvedValue(null);

    await expect(useCase.execute(10, 5)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(eliminarRelacion).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
  });

  it('lanza 404 si la relación ya está eliminada', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findRelacionById.mockResolvedValue({ ...relacion, estado: false });

    await expect(useCase.execute(10, 5)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(eliminarRelacion).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
  });

  it('lanza 404 si la relación pertenece a otro objetivo', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findRelacionById.mockResolvedValue({ ...relacion, origen_id: 99 });

    await expect(useCase.execute(10, 5)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(eliminarRelacion).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
  });

  it('lanza 404 si el plan no existe o está eliminado lógicamente', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findRelacionById.mockResolvedValue(relacion);
    findPlanActivoById.mockResolvedValue(null);

    await expect(useCase.execute(10, 5)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(eliminarRelacion).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está en Borrador', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findRelacionById.mockResolvedValue(relacion);
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'ACTIVO' },
    });

    await expect(useCase.execute(10, 5)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );

    expect(eliminarRelacion).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
  });

  it('elimina la relación, reconsulta con findById y devuelve el objetivo actualizado', async () => {
    const objetivoActualizado = {
      ...objetivo,
      relaciones_como_origen: [],
    };
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findRelacionById.mockResolvedValue(relacion);
    findPlanActivoById.mockResolvedValue(plan);
    eliminarRelacion.mockResolvedValue(undefined);
    findById.mockResolvedValue(objetivoActualizado);

    await expect(useCase.execute(10, 5)).resolves.toBe(objetivoActualizado);

    expect(eliminarRelacion).toHaveBeenCalledWith(5);
    expect(findById).toHaveBeenCalledWith(10);
    expect(findObjetivoActivoById).toHaveBeenCalledTimes(1);
  });

  it('lanza 404 si el re-fetch final devuelve null', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findRelacionById.mockResolvedValue(relacion);
    findPlanActivoById.mockResolvedValue(plan);
    eliminarRelacion.mockResolvedValue(undefined);
    findById.mockResolvedValue(null);

    await expect(useCase.execute(10, 5)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(eliminarRelacion).toHaveBeenCalledWith(5);
    expect(findById).toHaveBeenCalledWith(10);
  });
});
