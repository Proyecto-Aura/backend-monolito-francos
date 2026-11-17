import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { IniciativaEntityEnriquecido } from '../../../domain/repositories/types/iniciativa-repository.types';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { UpdateIniciativaTiUseCase } from './update-iniciativa-ti.use-case';

describe('UpdateIniciativaTiUseCase', () => {
  const findIniciativaById = jest.fn();
  const existsByNombre = jest.fn();
  const update = jest.fn();
  const iniciativaRepository = {
    findById: findIniciativaById,
    existsByNombre,
    update,
  } as unknown as jest.Mocked<IniciativaRepository>;
  const findObjetivoActivoById = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivoById: findObjetivoActivoById,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;
  const findPlanActivoById = jest.fn();
  const planEstrategicoRepository = {
    findActivoById: findPlanActivoById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const tipoModuloTi = { id: 8, codigo: 'TI', estado: true };
  const tipoModuloNeg = { id: 7, codigo: 'NEG', estado: true };
  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;
  const useCase = new UpdateIniciativaTiUseCase(
    iniciativaRepository,
    tipoModuloRepository,
    objetivoEstrategicoRepository,
    planEstrategicoRepository,
  );

  const plan = {
    id: 1,
    anio_inicio: 2026,
    anio_fin: 2028,
    estado: true,
    estado_plan: { id: 1, codigo: 'BORRADOR', estado: true },
  } as PlanEstrategicoEntityConEstado;
  const objetivo = {
    id: 10,
    tipo_modulo_id: tipoModuloTi.id,
    plan_estrategico_id: plan.id,
    estado: true,
  } as ObjetivoEstrategicoEntityEnriquecido;
  const objetivoDestino = {
    ...objetivo,
    id: 11,
  } as ObjetivoEstrategicoEntityEnriquecido;
  const iniciativa = {
    id: 20,
    nombre: 'Programa de fidelización',
    fecha_inicio: new Date('2026-01-15'),
    fecha_fin: new Date('2028-12-15'),
    estado: true,
    objetivo_estrategico: { id: objetivo.id, tipo_modulo_id: tipoModuloTi.id },
  } as IniciativaEntityEnriquecido;

  const prepararBase = () => {
    findIniciativaById.mockResolvedValue(iniciativa);
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(plan);
    existsByNombre.mockResolvedValue(false);
    update.mockResolvedValue(iniciativa);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findTipoModuloByCodigo.mockResolvedValue(tipoModuloTi);
  });

  it.each([null, { ...iniciativa, estado: false }])(
    'lanza 404 si la iniciativa no existe o está inactiva',
    async (resultado) => {
      findIniciativaById.mockResolvedValue(resultado);

      await expect(useCase.execute(iniciativa.id, {})).rejects.toThrow(
        new ResourceNotFoundError('Iniciativa no encontrada'),
      );
      expect(findObjetivoActivoById).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    },
  );

  it('lanza 404 si la iniciativa es de Negocio', async () => {
    prepararBase();
    findIniciativaById.mockResolvedValue({
      ...iniciativa,
      objetivo_estrategico: {
        ...iniciativa.objetivo_estrategico,
        tipo_modulo_id: tipoModuloNeg.id,
      },
    });

    const resultado = useCase.execute(iniciativa.id, {
      nombre: 'Nuevo nombre',
    });

    await expect(resultado).rejects.toBeInstanceOf(ResourceNotFoundError);
    await expect(resultado).rejects.toMatchObject({
      statusCode: 404,
      message: 'Iniciativa no encontrada',
    });
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(findObjetivoActivoById).not.toHaveBeenCalled();
    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(existsByNombre).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 404 si el objetivo actual no existe', async () => {
    findIniciativaById.mockResolvedValue(iniciativa);
    findObjetivoActivoById.mockResolvedValue(null);

    await expect(useCase.execute(iniciativa.id, {})).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 404 si el plan no existe', async () => {
    findIniciativaById.mockResolvedValue(iniciativa);
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(null);

    await expect(useCase.execute(iniciativa.id, {})).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(existsByNombre).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está en Borrador', async () => {
    prepararBase();
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'ACTIVO' },
    });

    await expect(useCase.execute(iniciativa.id, {})).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(existsByNombre).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 404 si el objetivo destino no existe', async () => {
    prepararBase();
    findObjetivoActivoById
      .mockResolvedValueOnce(objetivo)
      .mockResolvedValueOnce(null);

    await expect(
      useCase.execute(iniciativa.id, { objetivo_estrategico_id: 99 }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(existsByNombre).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 409 si el objetivo destino pertenece a otro plan', async () => {
    prepararBase();
    findObjetivoActivoById
      .mockResolvedValueOnce(objetivo)
      .mockResolvedValueOnce({ ...objetivoDestino, plan_estrategico_id: 2 });

    await expect(
      useCase.execute(iniciativa.id, {
        objetivo_estrategico_id: objetivoDestino.id,
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(existsByNombre).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 404 si el objetivo destino es de Negocio en el mismo plan', async () => {
    prepararBase();
    findObjetivoActivoById
      .mockResolvedValueOnce(objetivo)
      .mockResolvedValueOnce({
        ...objetivoDestino,
        tipo_modulo_id: tipoModuloNeg.id,
      });

    const resultado = useCase.execute(iniciativa.id, {
      objetivo_estrategico_id: objetivoDestino.id,
    });

    await expect(resultado).rejects.toBeInstanceOf(ResourceNotFoundError);
    await expect(resultado).rejects.toMatchObject({
      statusCode: 404,
      message: 'Objetivo estratégico no encontrado',
    });
    expect(findObjetivoActivoById).toHaveBeenNthCalledWith(
      2,
      objetivoDestino.id,
    );
    expect(existsByNombre).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('reasigna correctamente a un objetivo del mismo plan', async () => {
    prepararBase();
    findObjetivoActivoById
      .mockResolvedValueOnce(objetivo)
      .mockResolvedValueOnce(objetivoDestino);

    await expect(
      useCase.execute(iniciativa.id, {
        objetivo_estrategico_id: objetivoDestino.id,
      }),
    ).resolves.toBe(iniciativa);
    expect(existsByNombre).toHaveBeenCalledWith(
      objetivoDestino.id,
      iniciativa.nombre,
      iniciativa.id,
    );
    expect(update).toHaveBeenCalledWith(
      iniciativa.id,
      expect.objectContaining({ objetivo_estrategico_id: objetivoDestino.id }),
    );
  });

  it('lanza 409 si una fecha nueva queda después de la fecha existente', async () => {
    prepararBase();

    await expect(
      useCase.execute(iniciativa.id, { fecha_inicio: '2029-01-01' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(update).not.toHaveBeenCalled();
  });

  it.each([{ fecha_inicio: '2025-12-31' }, { fecha_fin: '2029-01-01' }])(
    'lanza 409 si una fecha está fuera del rango del plan',
    async (dto) => {
      prepararBase();

      await expect(useCase.execute(iniciativa.id, dto)).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
      expect(update).not.toHaveBeenCalled();
    },
  );

  it('lanza 409 si el nuevo nombre ya existe en el objetivo', async () => {
    prepararBase();
    existsByNombre.mockResolvedValue(true);

    await expect(
      useCase.execute(iniciativa.id, { nombre: '  Campaña digital  ' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(existsByNombre).toHaveBeenCalledWith(
      objetivo.id,
      'Campaña digital',
      iniciativa.id,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 409 si el nombre actual ya existe en el objetivo destino', async () => {
    prepararBase();
    findObjetivoActivoById
      .mockResolvedValueOnce(objetivo)
      .mockResolvedValueOnce(objetivoDestino);
    existsByNombre.mockResolvedValue(true);

    await expect(
      useCase.execute(iniciativa.id, {
        objetivo_estrategico_id: objetivoDestino.id,
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(existsByNombre).toHaveBeenCalledWith(
      objetivoDestino.id,
      iniciativa.nombre,
      iniciativa.id,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('actualiza pasando todos los campos esperados', async () => {
    prepararBase();
    const dto = {
      objetivo_estrategico_id: objetivo.id,
      nombre: '  Nueva   iniciativa  ',
      descripcion: 'Nueva descripción',
      presupuesto: 25000,
      responsable: 'Gerencia General',
      fecha_inicio: '2026-02-01',
      fecha_fin: '2028-11-30',
    };

    await expect(useCase.execute(iniciativa.id, dto)).resolves.toBe(iniciativa);
    expect(update).toHaveBeenCalledWith(iniciativa.id, {
      objetivo_estrategico_id: objetivo.id,
      nombre: 'Nueva iniciativa',
      descripcion: dto.descripcion,
      presupuesto: dto.presupuesto,
      responsable: dto.responsable,
      fecha_inicio: new Date(dto.fecha_inicio),
      fecha_fin: new Date(dto.fecha_fin),
    });
  });
});
