import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { EstadoObjetivoRepository } from '../../../domain/repositories/estado-objetivo.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { ActualizarEstadoObjetivoUseCase } from './actualizar-estado-objetivo.use-case';

describe('ActualizarEstadoObjetivoUseCase', () => {
  const findObjetivoActivoById = jest.fn();
  const updateEstadoObjetivo = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivoById: findObjetivoActivoById,
    updateEstadoObjetivo,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;

  const findPlanActivoById = jest.fn();
  const planEstrategicoRepository = {
    findActivoById: findPlanActivoById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;

  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;

  const findEstadoObjetivoByCodigo = jest.fn();
  const estadoObjetivoRepository = {
    findByCodigo: findEstadoObjetivoByCodigo,
  } as unknown as jest.Mocked<EstadoObjetivoRepository>;

  const useCase = new ActualizarEstadoObjetivoUseCase(
    objetivoEstrategicoRepository,
    planEstrategicoRepository,
    tipoModuloRepository,
    estadoObjetivoRepository,
  );

  const tipoModulo = {
    id: 7,
    codigo: 'NEG',
    nombre: 'Negocio',
    estado: true,
  };

  const estadoPendiente = {
    id: 1,
    codigo: 'PENDIENTE',
    nombre: 'Pendiente',
    orden: 1,
    estado: true,
  };

  const estadoEnProceso = {
    id: 2,
    codigo: 'EN_PROCESO',
    nombre: 'En proceso',
    orden: 2,
    estado: true,
  };

  const estadoCumplido = {
    id: 3,
    codigo: 'CUMPLIDO',
    nombre: 'Cumplido',
    orden: 3,
    estado: true,
  };

  const estadoCancelado = {
    id: 4,
    codigo: 'CANCELADO',
    nombre: 'Cancelado',
    orden: 4,
    estado: true,
  };

  const objetivo = {
    id: 10,
    codigo: 'PE-0001-OE-N-001',
    plan_estrategico_id: 1,
    perspectiva_bsc_id: 1,
    tipo_modulo_id: tipoModulo.id,
    oe_negocio_id: null,
    estado_objetivo_id: estadoPendiente.id,
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
    estado_objetivo: estadoPendiente,
    relaciones_como_origen: [],
  } as ObjetivoEstrategicoEntityEnriquecido;

  const plan = {
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan Estratégico 2026',
    descripcion: null,
    anio_inicio: 2026,
    anio_fin: 2030,
    estado_plan_id: 2,
    estado: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    estado_plan: {
      id: 2,
      codigo: 'ACTIVO',
      nombre: 'Activo',
      orden: 2,
      estado: true,
    },
  } as PlanEstrategicoEntityConEstado;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lanza 404 si el objetivo no existe o está eliminado lógicamente', async () => {
    findObjetivoActivoById.mockResolvedValue(null);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);

    await expect(
      useCase.execute(10, { estado_codigo: 'EN_PROCESO' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(findEstadoObjetivoByCodigo).not.toHaveBeenCalled();
    expect(updateEstadoObjetivo).not.toHaveBeenCalled();
  });

  it('lanza 404 si el objetivo pertenece a un tipo de módulo distinto de NEG', async () => {
    findObjetivoActivoById.mockResolvedValue({
      ...objetivo,
      tipo_modulo_id: 99,
    });
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);

    await expect(
      useCase.execute(10, { estado_codigo: 'EN_PROCESO' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(findEstadoObjetivoByCodigo).not.toHaveBeenCalled();
    expect(updateEstadoObjetivo).not.toHaveBeenCalled();
  });

  it('lanza 404 si el plan no existe o está eliminado lógicamente', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(null);

    await expect(
      useCase.execute(10, { estado_codigo: 'EN_PROCESO' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(findEstadoObjetivoByCodigo).not.toHaveBeenCalled();
    expect(updateEstadoObjetivo).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está Activo', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'BORRADOR' },
    });

    await expect(
      useCase.execute(10, { estado_codigo: 'EN_PROCESO' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(findEstadoObjetivoByCodigo).not.toHaveBeenCalled();
    expect(updateEstadoObjetivo).not.toHaveBeenCalled();
  });

  it('lanza 409 para la transición no permitida PENDIENTE a CUMPLIDO', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);

    await expect(
      useCase.execute(10, { estado_codigo: 'CUMPLIDO' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(findEstadoObjetivoByCodigo).not.toHaveBeenCalled();
    expect(updateEstadoObjetivo).not.toHaveBeenCalled();
  });

  it('lanza 409 para cualquier transición desde CUMPLIDO', async () => {
    findObjetivoActivoById.mockResolvedValue({
      ...objetivo,
      estado_objetivo_id: estadoCumplido.id,
      estado_objetivo: estadoCumplido,
    });
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);

    await expect(
      useCase.execute(10, { estado_codigo: 'CANCELADO' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(findEstadoObjetivoByCodigo).not.toHaveBeenCalled();
    expect(updateEstadoObjetivo).not.toHaveBeenCalled();
  });

  it('lanza 409 para cualquier transición desde CANCELADO', async () => {
    findObjetivoActivoById.mockResolvedValue({
      ...objetivo,
      estado_objetivo_id: estadoCancelado.id,
      estado_objetivo: estadoCancelado,
    });
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);

    await expect(
      useCase.execute(10, { estado_codigo: 'PENDIENTE' as never }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(findEstadoObjetivoByCodigo).not.toHaveBeenCalled();
    expect(updateEstadoObjetivo).not.toHaveBeenCalled();
  });

  it('lanza 404 si no se encuentra el estado destino permitido', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    findEstadoObjetivoByCodigo.mockResolvedValue(null);

    await expect(
      useCase.execute(10, { estado_codigo: 'EN_PROCESO' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(findEstadoObjetivoByCodigo).toHaveBeenCalledWith('EN_PROCESO');
    expect(updateEstadoObjetivo).not.toHaveBeenCalled();
  });

  it('permite la transición PENDIENTE a EN_PROCESO', async () => {
    const objetivoActualizado = {
      ...objetivo,
      estado_objetivo_id: estadoEnProceso.id,
      estado_objetivo: estadoEnProceso,
    };
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    findEstadoObjetivoByCodigo.mockResolvedValue(estadoEnProceso);
    updateEstadoObjetivo.mockResolvedValue(objetivoActualizado);

    await expect(
      useCase.execute(10, { estado_codigo: 'EN_PROCESO' }),
    ).resolves.toBe(objetivoActualizado);

    expect(updateEstadoObjetivo).toHaveBeenCalledWith(10, estadoEnProceso.id);
  });

  it('permite la transición PENDIENTE a CANCELADO', async () => {
    const objetivoActualizado = {
      ...objetivo,
      estado_objetivo_id: estadoCancelado.id,
      estado_objetivo: estadoCancelado,
    };
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    findEstadoObjetivoByCodigo.mockResolvedValue(estadoCancelado);
    updateEstadoObjetivo.mockResolvedValue(objetivoActualizado);

    await expect(
      useCase.execute(10, { estado_codigo: 'CANCELADO' }),
    ).resolves.toBe(objetivoActualizado);

    expect(updateEstadoObjetivo).toHaveBeenCalledWith(10, estadoCancelado.id);
  });

  it('permite la transición EN_PROCESO a CUMPLIDO', async () => {
    const objetivoEnProceso = {
      ...objetivo,
      estado_objetivo_id: estadoEnProceso.id,
      estado_objetivo: estadoEnProceso,
    };
    const objetivoActualizado = {
      ...objetivoEnProceso,
      estado_objetivo_id: estadoCumplido.id,
      estado_objetivo: estadoCumplido,
    };
    findObjetivoActivoById.mockResolvedValue(objetivoEnProceso);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    findEstadoObjetivoByCodigo.mockResolvedValue(estadoCumplido);
    updateEstadoObjetivo.mockResolvedValue(objetivoActualizado);

    await expect(
      useCase.execute(10, { estado_codigo: 'CUMPLIDO' }),
    ).resolves.toBe(objetivoActualizado);

    expect(updateEstadoObjetivo).toHaveBeenCalledWith(10, estadoCumplido.id);
  });

  it('permite la transición EN_PROCESO a CANCELADO', async () => {
    const objetivoEnProceso = {
      ...objetivo,
      estado_objetivo_id: estadoEnProceso.id,
      estado_objetivo: estadoEnProceso,
    };
    const objetivoActualizado = {
      ...objetivoEnProceso,
      estado_objetivo_id: estadoCancelado.id,
      estado_objetivo: estadoCancelado,
    };
    findObjetivoActivoById.mockResolvedValue(objetivoEnProceso);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    findEstadoObjetivoByCodigo.mockResolvedValue(estadoCancelado);
    updateEstadoObjetivo.mockResolvedValue(objetivoActualizado);

    await expect(
      useCase.execute(10, { estado_codigo: 'CANCELADO' }),
    ).resolves.toBe(objetivoActualizado);

    expect(updateEstadoObjetivo).toHaveBeenCalledWith(10, estadoCancelado.id);
  });
});
