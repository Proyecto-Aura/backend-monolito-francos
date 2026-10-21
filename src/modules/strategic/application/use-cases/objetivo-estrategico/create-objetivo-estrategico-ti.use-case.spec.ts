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
import { CreateObjetivoEstrategicoTiUseCase } from './create-objetivo-estrategico-ti.use-case';
import { ValidarOeNegocioService } from './validar-oe-negocio.service';
import { ValidarRelacionesOeService } from './validar-relaciones-oe.service';

describe('CreateObjetivoEstrategicoTiUseCase', () => {
  const existsByName = jest.fn();
  const create = jest.fn();
  const objetivoEstrategicoRepository = {
    existsByName,
    create,
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

  const validarOeNegocio = jest.fn();
  const validarOeNegocioService = {
    execute: validarOeNegocio,
  } as unknown as jest.Mocked<ValidarOeNegocioService>;

  const useCase = new CreateObjetivoEstrategicoTiUseCase(
    objetivoEstrategicoRepository,
    planEstrategicoRepository,
    perspectivaBscRepository,
    tipoModuloRepository,
    validarRelacionesOe,
    validarOeNegocioService,
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
    codigo: 'TI',
    nombre: 'TI',
    estado: true,
  };

  const objetivo = {
    id: 10,
    codigo: 'PE-0001-OE-TI-001',
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
    relaciones_como_origen: [],
  } as ObjetivoEstrategicoEntityEnriquecido;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lanza 404 si el plan no existe', async () => {
    findPlanActivoById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        plan_estrategico_id: 1,
        oe_negocio_id: 20,
        perspectiva_bsc_id: 1,
        responsable: 'Ana Torres',
        nombre: 'Incrementar la rentabilidad',
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(findPerspectivaById).not.toHaveBeenCalled();
    expect(findTipoModuloByCodigo).not.toHaveBeenCalled();
    expect(existsByName).not.toHaveBeenCalled();
    expect(validarRelaciones).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está en Borrador', async () => {
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'ACTIVO' },
    });

    await expect(
      useCase.execute({
        plan_estrategico_id: 1,
        oe_negocio_id: 20,
        perspectiva_bsc_id: 1,
        responsable: 'Ana Torres',
        nombre: 'Incrementar la rentabilidad',
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(findPerspectivaById).not.toHaveBeenCalled();
    expect(findTipoModuloByCodigo).not.toHaveBeenCalled();
    expect(existsByName).not.toHaveBeenCalled();
    expect(validarRelaciones).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 404 si la perspectiva no existe o está inactiva', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findPerspectivaById.mockResolvedValue({
      ...perspectiva,
      estado: false,
    });

    await expect(
      useCase.execute({
        plan_estrategico_id: 1,
        oe_negocio_id: 20,
        perspectiva_bsc_id: 1,
        responsable: 'Ana Torres',
        nombre: 'Incrementar la rentabilidad',
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(findTipoModuloByCodigo).not.toHaveBeenCalled();
    expect(existsByName).not.toHaveBeenCalled();
    expect(validarRelaciones).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 404 si el tipo de módulo TI no existe o está inactivo', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findPerspectivaById.mockResolvedValue(perspectiva);
    findTipoModuloByCodigo.mockResolvedValue({
      ...tipoModulo,
      estado: false,
    });

    await expect(
      useCase.execute({
        plan_estrategico_id: 1,
        oe_negocio_id: 20,
        perspectiva_bsc_id: 1,
        responsable: 'Ana Torres',
        nombre: 'Incrementar la rentabilidad',
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(existsByName).not.toHaveBeenCalled();
    expect(validarRelaciones).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si ya existe un objetivo con el nombre en el plan y tipo', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findPerspectivaById.mockResolvedValue(perspectiva);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    existsByName.mockResolvedValue(true);

    await expect(
      useCase.execute({
        plan_estrategico_id: 1,
        oe_negocio_id: 20,
        perspectiva_bsc_id: 1,
        responsable: 'Ana Torres',
        nombre: 'Incrementar la rentabilidad',
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(validarRelaciones).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('crea el objetivo normalizando sus datos y validando sus relaciones', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findPerspectivaById.mockResolvedValue(perspectiva);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    existsByName.mockResolvedValue(false);
    validarRelaciones.mockResolvedValue(undefined);
    create.mockResolvedValue(objetivo);

    await expect(
      useCase.execute({
        plan_estrategico_id: 1,
        oe_negocio_id: 20,
        perspectiva_bsc_id: 1,
        responsable: 'Ana Torres',
        nombre: '  Incrementar   la   rentabilidad  ',
        descripcion: '  Mejorar el margen operativo  ',
        relaciones_destino_ids: [20, 30],
      }),
    ).resolves.toBe(objetivo);

    expect(existsByName).toHaveBeenCalledWith(
      plan.id,
      tipoModulo.id,
      'Incrementar la rentabilidad',
    );
    expect(validarRelaciones).toHaveBeenCalledWith({
      plan_estrategico_id: plan.id,
      tipo_modulo_id: tipoModulo.id,
      relaciones_destino_ids: [20, 30],
    });
    expect(validarOeNegocio).toHaveBeenCalledWith({
      oe_negocio_id: 20,
      plan_estrategico_id: plan.id,
    });
    expect(create).toHaveBeenCalledWith(
      {
        plan_estrategico_id: plan.id,
        perspectiva_bsc_id: perspectiva.id,
        responsable: 'Ana Torres',
        nombre: 'Incrementar la rentabilidad',
        descripcion: 'Mejorar el margen operativo',
        relaciones_destino_ids: [20, 30],
        oe_negocio_id: 20,
      },
      tipoModulo.id,
      'TI',
    );
  });

  it('crea el objetivo con descripción null si no viene en el dto', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findPerspectivaById.mockResolvedValue(perspectiva);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    existsByName.mockResolvedValue(false);
    validarRelaciones.mockResolvedValue(undefined);
    create.mockResolvedValue({ ...objetivo, descripcion: null });

    await expect(
      useCase.execute({
        plan_estrategico_id: 1,
        oe_negocio_id: 20,
        perspectiva_bsc_id: 1,
        responsable: 'Ana Torres',
        nombre: 'Incrementar la rentabilidad',
        relaciones_destino_ids: [],
      }),
    ).resolves.toEqual({ ...objetivo, descripcion: null });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ descripcion: null }),
      tipoModulo.id,
      'TI',
    );
  });

  it('usa una lista vacía al crear y validar si relaciones_destino_ids es undefined', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findPerspectivaById.mockResolvedValue(perspectiva);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    existsByName.mockResolvedValue(false);
    validarRelaciones.mockResolvedValue(undefined);
    create.mockResolvedValue(objetivo);

    await expect(
      useCase.execute({
        plan_estrategico_id: 1,
        oe_negocio_id: 20,
        perspectiva_bsc_id: 1,
        responsable: 'Ana Torres',
        nombre: 'Incrementar la rentabilidad',
      }),
    ).resolves.toBe(objetivo);

    expect(validarRelaciones).toHaveBeenCalledWith({
      plan_estrategico_id: plan.id,
      tipo_modulo_id: tipoModulo.id,
      relaciones_destino_ids: [],
    });
    expect(create).toHaveBeenCalledWith(
      {
        plan_estrategico_id: plan.id,
        perspectiva_bsc_id: perspectiva.id,
        responsable: 'Ana Torres',
        nombre: 'Incrementar la rentabilidad',
        descripcion: null,
        relaciones_destino_ids: [],
        oe_negocio_id: 20,
      },
      tipoModulo.id,
      'TI',
    );
  });

  it('propaga el error de validar el objetivo de Negocio y no crea', async () => {
    const error = new ResourceConflictError(
      'El objetivo vinculado debe ser un objetivo estratégico de Negocio',
    );
    findPlanActivoById.mockResolvedValue(plan);
    findPerspectivaById.mockResolvedValue(perspectiva);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    existsByName.mockResolvedValue(false);
    validarRelaciones.mockResolvedValue(undefined);
    validarOeNegocio.mockRejectedValue(error);

    await expect(
      useCase.execute({
        plan_estrategico_id: plan.id,
        perspectiva_bsc_id: perspectiva.id,
        oe_negocio_id: 20,
        responsable: 'Ana Torres',
        nombre: 'Incrementar la rentabilidad',
      }),
    ).rejects.toBe(error);

    expect(validarOeNegocio).toHaveBeenCalledWith({
      oe_negocio_id: 20,
      plan_estrategico_id: plan.id,
    });
    expect(create).not.toHaveBeenCalled();
  });
});
