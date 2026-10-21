import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { EliminarObjetivoEstrategicoTiUseCase } from './eliminar-objetivo-estrategico-ti.use-case';

describe('EliminarObjetivoEstrategicoTiUseCase', () => {
  const findObjetivoActivoById = jest.fn();
  const tieneKpisORelacionesActivas = jest.fn();
  const setEstado = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivoById: findObjetivoActivoById,
    tieneKpisORelacionesActivas,
    setEstado,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;

  const findPlanActivoById = jest.fn();
  const planEstrategicoRepository = {
    findActivoById: findPlanActivoById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;

  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;

  const useCase = new EliminarObjetivoEstrategicoTiUseCase(
    objetivoEstrategicoRepository,
    planEstrategicoRepository,
    tipoModuloRepository,
  );

  const tipoModulo = {
    id: 7,
    codigo: 'TI',
    nombre: 'TI',
    estado: true,
  };

  const objetivo = {
    id: 10,
    codigo: 'PE-0001-OE-TI-001',
    plan_estrategico_id: 1,
    perspectiva_bsc_id: 1,
    tipo_modulo_id: tipoModulo.id,
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
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);

    await expect(useCase.execute(10)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(tieneKpisORelacionesActivas).not.toHaveBeenCalled();
    expect(setEstado).not.toHaveBeenCalled();
  });

  it('lanza 404 si el objetivo pertenece a un tipo de módulo distinto de TI', async () => {
    findObjetivoActivoById.mockResolvedValue({
      ...objetivo,
      tipo_modulo_id: 99,
    });
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);

    await expect(useCase.execute(10)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(tieneKpisORelacionesActivas).not.toHaveBeenCalled();
    expect(setEstado).not.toHaveBeenCalled();
  });

  it('lanza 404 si el plan no existe o está eliminado lógicamente', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(null);

    await expect(useCase.execute(10)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(tieneKpisORelacionesActivas).not.toHaveBeenCalled();
    expect(setEstado).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está en Borrador', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'ACTIVO' },
    });

    await expect(useCase.execute(10)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );

    expect(tieneKpisORelacionesActivas).not.toHaveBeenCalled();
    expect(setEstado).not.toHaveBeenCalled();
  });

  it('lanza 409 si el objetivo tiene KPIs o relaciones activas', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    tieneKpisORelacionesActivas.mockResolvedValue(true);

    await expect(useCase.execute(10)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );

    expect(tieneKpisORelacionesActivas).toHaveBeenCalledWith(10);
    expect(setEstado).not.toHaveBeenCalled();
  });

  it('desactiva el objetivo y devuelve el resultado del repositorio', async () => {
    const objetivoEliminado = { ...objetivo, estado: false };
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    tieneKpisORelacionesActivas.mockResolvedValue(false);
    setEstado.mockResolvedValue(objetivoEliminado);

    await expect(useCase.execute(10)).resolves.toBe(objetivoEliminado);

    expect(setEstado).toHaveBeenCalledWith(10, false);
  });
});
