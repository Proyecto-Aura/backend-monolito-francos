import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { EstadoIniciativaRepository } from '../../../domain/repositories/estado-iniciativa.repository';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { IniciativaEntityEnriquecido } from '../../../domain/repositories/types/iniciativa-repository.types';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { ActualizarEstadoIniciativaUseCase } from './actualizar-estado-iniciativa.use-case';

describe('ActualizarEstadoIniciativaUseCase', () => {
  const findIniciativaById = jest.fn();
  const updateEstadoIniciativa = jest.fn();
  const iniciativaRepository = {
    findById: findIniciativaById,
    updateEstadoIniciativa,
  } as unknown as jest.Mocked<IniciativaRepository>;
  const findObjetivoActivoById = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivoById: findObjetivoActivoById,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;
  const findPlanActivoById = jest.fn();
  const planEstrategicoRepository = {
    findActivoById: findPlanActivoById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const findEstadoByCodigo = jest.fn();
  const estadoIniciativaRepository = {
    findByCodigo: findEstadoByCodigo,
  } as unknown as jest.Mocked<EstadoIniciativaRepository>;
  const useCase = new ActualizarEstadoIniciativaUseCase(
    iniciativaRepository,
    objetivoEstrategicoRepository,
    planEstrategicoRepository,
    estadoIniciativaRepository,
  );

  const plan = {
    id: 1,
    estado: true,
    estado_plan: { id: 2, codigo: 'ACTIVO', estado: true },
  } as PlanEstrategicoEntityConEstado;
  const objetivo = {
    id: 10,
    plan_estrategico_id: plan.id,
    estado: true,
  } as ObjetivoEstrategicoEntityEnriquecido;
  const iniciativa = {
    id: 20,
    estado: true,
    objetivo_estrategico: { id: objetivo.id },
    estado_iniciativa: {
      id: 1,
      codigo: 'PENDIENTE',
      nombre: 'Pendiente',
      orden: 1,
      estado: true,
    },
  } as IniciativaEntityEnriquecido;
  const estadoEnProceso = {
    id: 2,
    codigo: 'EN_PROCESO',
    nombre: 'En Proceso',
    orden: 2,
    estado: true,
  };

  const prepararBase = () => {
    findIniciativaById.mockResolvedValue(iniciativa);
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(plan);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([null, { ...iniciativa, estado: false }])(
    'lanza 404 si la iniciativa no existe o está inactiva',
    async (resultado) => {
      findIniciativaById.mockResolvedValue(resultado);

      await expect(
        useCase.execute(iniciativa.id, { estado_codigo: 'EN_PROCESO' }),
      ).rejects.toBeInstanceOf(ResourceNotFoundError);
      expect(findObjetivoActivoById).not.toHaveBeenCalled();
      expect(updateEstadoIniciativa).not.toHaveBeenCalled();
    },
  );

  it('lanza 404 si el objetivo no existe', async () => {
    findIniciativaById.mockResolvedValue(iniciativa);
    findObjetivoActivoById.mockResolvedValue(null);

    await expect(
      useCase.execute(iniciativa.id, { estado_codigo: 'EN_PROCESO' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(updateEstadoIniciativa).not.toHaveBeenCalled();
  });

  it('lanza 404 si el plan no existe', async () => {
    findIniciativaById.mockResolvedValue(iniciativa);
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(null);

    await expect(
      useCase.execute(iniciativa.id, { estado_codigo: 'EN_PROCESO' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(findEstadoByCodigo).not.toHaveBeenCalled();
    expect(updateEstadoIniciativa).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está Activo', async () => {
    prepararBase();
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'BORRADOR' },
    });

    await expect(
      useCase.execute(iniciativa.id, { estado_codigo: 'EN_PROCESO' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(findEstadoByCodigo).not.toHaveBeenCalled();
    expect(updateEstadoIniciativa).not.toHaveBeenCalled();
  });

  it.each([
    ['PENDIENTE', 'COMPLETADA'],
    ['COMPLETADA', 'CANCELADA'],
    ['CANCELADA', 'EN_PROCESO'],
  ] as const)(
    'lanza 409 para la transición %s → %s',
    async (actual, destino) => {
      prepararBase();
      findIniciativaById.mockResolvedValue({
        ...iniciativa,
        estado_iniciativa: { ...iniciativa.estado_iniciativa, codigo: actual },
      });

      await expect(
        useCase.execute(iniciativa.id, { estado_codigo: destino }),
      ).rejects.toBeInstanceOf(ResourceConflictError);
      expect(findEstadoByCodigo).not.toHaveBeenCalled();
      expect(updateEstadoIniciativa).not.toHaveBeenCalled();
    },
  );

  it('lanza 404 si el nuevo estado no existe', async () => {
    prepararBase();
    findEstadoByCodigo.mockResolvedValue(null);

    await expect(
      useCase.execute(iniciativa.id, { estado_codigo: 'EN_PROCESO' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(updateEstadoIniciativa).not.toHaveBeenCalled();
  });

  it('avanza de Pendiente a En Proceso sin motivo de cancelación', async () => {
    prepararBase();
    findEstadoByCodigo.mockResolvedValue(estadoEnProceso);
    updateEstadoIniciativa.mockResolvedValue(iniciativa);

    await expect(
      useCase.execute(iniciativa.id, { estado_codigo: 'EN_PROCESO' }),
    ).resolves.toBe(iniciativa);
    expect(updateEstadoIniciativa).toHaveBeenCalledWith(
      iniciativa.id,
      estadoEnProceso.id,
      undefined,
    );
  });

  it('cancela guardando el motivo de cancelación', async () => {
    prepararBase();
    const estadoCancelada = {
      id: 4,
      codigo: 'CANCELADA',
      nombre: 'Cancelada',
      orden: 4,
      estado: true,
    };
    findEstadoByCodigo.mockResolvedValue(estadoCancelada);
    updateEstadoIniciativa.mockResolvedValue(iniciativa);

    await expect(
      useCase.execute(iniciativa.id, {
        estado_codigo: 'CANCELADA',
        motivo_cancelacion: 'el motivo',
      }),
    ).resolves.toBe(iniciativa);
    expect(updateEstadoIniciativa).toHaveBeenCalledWith(
      iniciativa.id,
      estadoCancelada.id,
      'el motivo',
    );
  });
});
