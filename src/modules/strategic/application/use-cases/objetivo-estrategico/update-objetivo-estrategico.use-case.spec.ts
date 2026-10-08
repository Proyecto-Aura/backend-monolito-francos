import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PerspectivaBscRepository } from '../../../domain/repositories/perspectiva-bsc.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { UpdateObjetivoEstrategicoUseCase } from './update-objetivo-estrategico.use-case';
import { ValidarRelacionesOeService } from './validar-relaciones-oe.service';

describe('UpdateObjetivoEstrategicoUseCase', () => {
  const findObjetivoActivoById = jest.fn();
  const existsByName = jest.fn();
  const update = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivoById: findObjetivoActivoById,
    existsByName,
    update,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;

  const findPlanActivoById = jest.fn();
  const planEstrategicoRepository = {
    findActivoById: findPlanActivoById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;

  const findPerspectivaById = jest.fn();
  const perspectivaBscRepository = {
    findById: findPerspectivaById,
  } as unknown as jest.Mocked<PerspectivaBscRepository>;

  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;

  const validarRelaciones = jest.fn();
  const validarRelacionesOe = {
    execute: validarRelaciones,
  } as unknown as jest.Mocked<ValidarRelacionesOeService>;

  const useCase = new UpdateObjetivoEstrategicoUseCase(
    objetivoEstrategicoRepository,
    planEstrategicoRepository,
    perspectivaBscRepository,
    tipoModuloRepository,
    validarRelacionesOe,
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

  const perspectiva = {
    id: 1,
    nombre: 'Financiera',
    descripcion: null,
    orden: 1,
    estado: true,
  };

  const tipoModulo = {
    id: 7,
    codigo: 'NEG',
    nombre: 'Negocio',
    estado: true,
  };

  const objetivo = {
    id: 10,
    codigo: 'PE-0001-OE-N-001',
    plan_estrategico_id: plan.id,
    perspectiva_bsc_id: perspectiva.id,
    tipo_modulo_id: tipoModulo.id,
    oe_negocio_id: null,
    estado_objetivo_id: 1,
    responsable: 'Ana Torres',
    nombre: 'Incrementar la rentabilidad',
    descripcion: 'Mejorar el margen operativo',
    estado: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    perspectiva_bsc: perspectiva,
    estado_objetivo: {
      id: 1,
      codigo: 'PENDIENTE',
      nombre: 'Pendiente',
      orden: 1,
      estado: true,
    },
    relaciones_como_origen: [
      { id: 1, origen_id: 10, destino_id: 20, estado: true },
      { id: 2, origen_id: 10, destino_id: 21, estado: false },
    ],
  } as ObjetivoEstrategicoEntityEnriquecido;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lanza 404 si el objetivo no existe o está eliminado lógicamente', async () => {
    findObjetivoActivoById.mockResolvedValue(null);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);

    await expect(
      useCase.execute(10, { responsable: 'Luis Pérez' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(existsByName).not.toHaveBeenCalled();
    expect(findPerspectivaById).not.toHaveBeenCalled();
    expect(validarRelaciones).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 404 si el objetivo pertenece a un tipo de módulo distinto de NEG', async () => {
    findObjetivoActivoById.mockResolvedValue({
      ...objetivo,
      tipo_modulo_id: 99,
    });
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);

    await expect(
      useCase.execute(10, { responsable: 'Luis Pérez' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(existsByName).not.toHaveBeenCalled();
    expect(findPerspectivaById).not.toHaveBeenCalled();
    expect(validarRelaciones).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 404 si el plan no existe o está eliminado lógicamente', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(null);

    await expect(
      useCase.execute(10, { responsable: 'Luis Pérez' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(existsByName).not.toHaveBeenCalled();
    expect(findPerspectivaById).not.toHaveBeenCalled();
    expect(validarRelaciones).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está en Borrador', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'ACTIVO' },
    });

    await expect(
      useCase.execute(10, { responsable: 'Luis Pérez' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(existsByName).not.toHaveBeenCalled();
    expect(findPerspectivaById).not.toHaveBeenCalled();
    expect(validarRelaciones).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 409 si el nombre nuevo ya pertenece a otro objetivo del plan', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    existsByName.mockResolvedValue(true);

    await expect(
      useCase.execute(10, { nombre: 'Reducir costos operativos' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(existsByName).toHaveBeenCalledWith(
      objetivo.plan_estrategico_id,
      objetivo.tipo_modulo_id,
      'Reducir costos operativos',
      objetivo.id,
    );
    expect(findPerspectivaById).not.toHaveBeenCalled();
    expect(validarRelaciones).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('no consulta duplicados si el nombre normalizado solo cambia mayúsculas o espacios', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    update.mockResolvedValue(objetivo);

    await expect(
      useCase.execute(10, { nombre: '  INCREMENTAR   LA   RENTABILIDAD  ' }),
    ).resolves.toBe(objetivo);

    expect(existsByName).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(10, {
      perspectiva_bsc_id: undefined,
      responsable: undefined,
      nombre: 'INCREMENTAR LA RENTABILIDAD',
      descripcion: undefined,
      relaciones_destino_ids: undefined,
    });
  });

  it('lanza 404 si la nueva perspectiva no existe o está inactiva', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    findPerspectivaById.mockResolvedValue({
      ...perspectiva,
      id: 2,
      estado: false,
    });

    await expect(
      useCase.execute(10, { perspectiva_bsc_id: 2 }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(existsByName).not.toHaveBeenCalled();
    expect(validarRelaciones).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('no valida ni modifica relaciones si relaciones_destino_ids es undefined', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    update.mockResolvedValue(objetivo);

    await expect(
      useCase.execute(10, { responsable: 'Luis Pérez' }),
    ).resolves.toBe(objetivo);

    expect(validarRelaciones).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(10, {
      perspectiva_bsc_id: undefined,
      responsable: 'Luis Pérez',
      nombre: undefined,
      descripcion: undefined,
      relaciones_destino_ids: undefined,
    });
  });

  it('deduplica relaciones_destino_ids antes de validarlas y actualizarlas', async () => {
    const objetivoSinRelaciones = {
      ...objetivo,
      relaciones_como_origen: [],
    };
    findObjetivoActivoById.mockResolvedValue(objetivoSinRelaciones);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    validarRelaciones.mockResolvedValue(undefined);
    update.mockResolvedValue(objetivoSinRelaciones);

    await expect(
      useCase.execute(10, { relaciones_destino_ids: [20, 20, 30, 30] }),
    ).resolves.toBe(objetivoSinRelaciones);

    expect(validarRelaciones).toHaveBeenCalledWith({
      origen_id: objetivo.id,
      plan_estrategico_id: objetivo.plan_estrategico_id,
      tipo_modulo_id: objetivo.tipo_modulo_id,
      relaciones_destino_ids: [20, 30],
    });
    expect(update).toHaveBeenCalledWith(10, {
      perspectiva_bsc_id: undefined,
      responsable: undefined,
      nombre: undefined,
      descripcion: undefined,
      relaciones_destino_ids: [20, 30],
    });
  });

  it('valida solo los destinos nuevos y conserva la lista final completa', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    validarRelaciones.mockResolvedValue(undefined);
    update.mockResolvedValue(objetivo);

    await expect(
      useCase.execute(10, { relaciones_destino_ids: [20, 21, 30] }),
    ).resolves.toBe(objetivo);

    expect(validarRelaciones).toHaveBeenCalledWith({
      origen_id: objetivo.id,
      plan_estrategico_id: objetivo.plan_estrategico_id,
      tipo_modulo_id: objetivo.tipo_modulo_id,
      relaciones_destino_ids: [21, 30],
    });
    expect(update).toHaveBeenCalledWith(10, {
      perspectiva_bsc_id: undefined,
      responsable: undefined,
      nombre: undefined,
      descripcion: undefined,
      relaciones_destino_ids: [20, 21, 30],
    });
  });

  it('envía descripcion undefined si no viene en el dto', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    update.mockResolvedValue(objetivo);

    await expect(
      useCase.execute(10, { responsable: 'Luis Pérez' }),
    ).resolves.toBe(objetivo);

    expect(update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ descripcion: undefined }),
    );
  });

  it('normaliza una descripción vacía o con espacios a null', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    update.mockResolvedValue({ ...objetivo, descripcion: null });

    await expect(useCase.execute(10, { descripcion: '   ' })).resolves.toEqual({
      ...objetivo,
      descripcion: null,
    });

    expect(update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ descripcion: null }),
    );
  });

  it('normaliza una descripción con texto usando trim', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    update.mockResolvedValue(objetivo);

    await expect(
      useCase.execute(10, { descripcion: '  Nueva descripción  ' }),
    ).resolves.toBe(objetivo);

    expect(update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ descripcion: 'Nueva descripción' }),
    );
  });

  it('actualiza correctamente todos los campos con el objeto exacto', async () => {
    const perspectivaNueva = { ...perspectiva, id: 2, nombre: 'Clientes' };
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
    existsByName.mockResolvedValue(false);
    findPerspectivaById.mockResolvedValue(perspectivaNueva);
    validarRelaciones.mockResolvedValue(undefined);
    update.mockResolvedValue(objetivo);

    await expect(
      useCase.execute(10, {
        perspectiva_bsc_id: 2,
        responsable: 'Luis Pérez',
        nombre: '  Reducir   costos operativos  ',
        descripcion: '  Optimizar procesos internos  ',
        relaciones_destino_ids: [20, 30],
      }),
    ).resolves.toBe(objetivo);

    expect(existsByName).toHaveBeenCalledWith(
      objetivo.plan_estrategico_id,
      objetivo.tipo_modulo_id,
      'Reducir costos operativos',
      objetivo.id,
    );
    expect(findPerspectivaById).toHaveBeenCalledWith(2);
    expect(validarRelaciones).toHaveBeenCalledWith({
      origen_id: objetivo.id,
      plan_estrategico_id: objetivo.plan_estrategico_id,
      tipo_modulo_id: objetivo.tipo_modulo_id,
      relaciones_destino_ids: [30],
    });
    expect(update).toHaveBeenCalledWith(10, {
      perspectiva_bsc_id: 2,
      responsable: 'Luis Pérez',
      nombre: 'Reducir costos operativos',
      descripcion: 'Optimizar procesos internos',
      relaciones_destino_ids: [20, 30],
    });
  });
});
