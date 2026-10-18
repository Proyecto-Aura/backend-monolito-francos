import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { FrecuenciaMedicionRepository } from '../../../domain/repositories/frecuencia-medicion.repository';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { KpiEntityEnriquecido } from '../../../domain/repositories/types/kpi-repository.types';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { UnidadMedidaKpiRepository } from '../../../domain/repositories/unidad-medida-kpi.repository';
import { UpdateKpiUseCase } from './update-kpi.use-case';

describe('UpdateKpiUseCase', () => {
  const findKpiById = jest.fn();
  const existsByNombre = jest.fn();
  const update = jest.fn();
  const kpiRepository = {
    findById: findKpiById,
    existsByNombre,
    update,
  } as unknown as jest.Mocked<KpiRepository>;
  const findObjetivoActivoById = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivoById: findObjetivoActivoById,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;
  const findPlanActivoById = jest.fn();
  const planEstrategicoRepository = {
    findActivoById: findPlanActivoById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const findFrecuenciaById = jest.fn();
  const frecuenciaMedicionRepository = {
    findById: findFrecuenciaById,
  } as unknown as jest.Mocked<FrecuenciaMedicionRepository>;
  const findUnidadById = jest.fn();
  const unidadMedidaKpiRepository = {
    findById: findUnidadById,
  } as unknown as jest.Mocked<UnidadMedidaKpiRepository>;
  const useCase = new UpdateKpiUseCase(
    kpiRepository,
    objetivoEstrategicoRepository,
    planEstrategicoRepository,
    frecuenciaMedicionRepository,
    unidadMedidaKpiRepository,
  );

  const plan = {
    id: 1,
    anio_inicio: 2026,
    anio_fin: 2027,
    estado: true,
    estado_plan: { id: 1, codigo: 'BORRADOR', estado: true },
  } as PlanEstrategicoEntityConEstado;
  const objetivo = {
    id: 10,
    plan_estrategico_id: plan.id,
    estado: true,
  } as ObjetivoEstrategicoEntityEnriquecido;
  const objetivoDestino = {
    ...objetivo,
    id: 11,
  } as ObjetivoEstrategicoEntityEnriquecido;
  const kpi = {
    id: 20,
    nombre: 'Rentabilidad',
    estado: true,
    objetivo_estrategico: { id: objetivo.id },
  } as KpiEntityEnriquecido;
  const metas = [
    {
      anio: 2026,
      meta: 100,
      operador_verde: '>=' as const,
      operador_amarillo: '>=' as const,
      valor_amarillo: 80,
    },
    {
      anio: 2027,
      meta: 110,
      operador_verde: '>=' as const,
      operador_amarillo: '>=' as const,
      valor_amarillo: 90,
    },
  ];

  const prepararBase = () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(plan);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([null, { ...kpi, estado: false }])(
    'lanza 404 si el KPI no existe o está inactivo',
    async (resultado) => {
      findKpiById.mockResolvedValue(resultado);

      await expect(useCase.execute(kpi.id, {})).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
      expect(findObjetivoActivoById).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    },
  );

  it('lanza 404 si el objetivo actual no existe', async () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById.mockResolvedValue(null);

    await expect(useCase.execute(kpi.id, {})).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 404 si el plan no existe', async () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(null);

    await expect(useCase.execute(kpi.id, {})).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(existsByNombre).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está en Borrador', async () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'ACTIVO' },
    });

    await expect(useCase.execute(kpi.id, {})).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(existsByNombre).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 404 si el nuevo objetivo no existe', async () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById
      .mockResolvedValueOnce(objetivo)
      .mockResolvedValueOnce(null);
    findPlanActivoById.mockResolvedValue(plan);

    await expect(
      useCase.execute(kpi.id, { objetivo_estrategico_id: 99 }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(existsByNombre).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 409 si el nuevo objetivo pertenece a otro plan', async () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById
      .mockResolvedValueOnce(objetivo)
      .mockResolvedValueOnce({ ...objetivoDestino, plan_estrategico_id: 2 });
    findPlanActivoById.mockResolvedValue(plan);

    await expect(
      useCase.execute(kpi.id, {
        objetivo_estrategico_id: objetivoDestino.id,
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(existsByNombre).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('reasigna correctamente a un objetivo del mismo plan', async () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById
      .mockResolvedValueOnce(objetivo)
      .mockResolvedValueOnce(objetivoDestino);
    findPlanActivoById.mockResolvedValue(plan);
    existsByNombre.mockResolvedValue(false);
    update.mockResolvedValue(kpi);

    await expect(
      useCase.execute(kpi.id, {
        objetivo_estrategico_id: objetivoDestino.id,
      }),
    ).resolves.toBe(kpi);
    expect(existsByNombre).toHaveBeenCalledWith(
      objetivoDestino.id,
      kpi.nombre,
      kpi.id,
    );
    expect(update).toHaveBeenCalledWith(
      kpi.id,
      expect.objectContaining({ objetivo_estrategico_id: objetivoDestino.id }),
    );
  });

  it('lanza 409 si el nuevo nombre ya existe en otro KPI del objetivo', async () => {
    prepararBase();
    existsByNombre.mockResolvedValue(true);

    await expect(
      useCase.execute(kpi.id, { nombre: '  Conversión  ' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(existsByNombre).toHaveBeenCalledWith(
      objetivo.id,
      'Conversión',
      kpi.id,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 409 si el nombre no cambia y ya existe en el objetivo destino', async () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById
      .mockResolvedValueOnce(objetivo)
      .mockResolvedValueOnce(objetivoDestino);
    findPlanActivoById.mockResolvedValue(plan);
    existsByNombre.mockResolvedValue(true);

    await expect(
      useCase.execute(kpi.id, {
        objetivo_estrategico_id: objetivoDestino.id,
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(existsByNombre).toHaveBeenCalledWith(
      objetivoDestino.id,
      kpi.nombre,
      kpi.id,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it.each([null, { id: 3, estado: false }])(
    'lanza 404 si la frecuencia enviada no existe o está inactiva',
    async (resultado) => {
      prepararBase();
      findFrecuenciaById.mockResolvedValue(resultado);

      await expect(
        useCase.execute(kpi.id, { frecuencia_id: 3 }),
      ).rejects.toBeInstanceOf(ResourceNotFoundError);
      expect(findUnidadById).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    },
  );

  it.each([null, { id: 4, estado: false }])(
    'lanza 404 si la unidad enviada no existe o está inactiva',
    async (resultado) => {
      prepararBase();
      findUnidadById.mockResolvedValue(resultado);

      await expect(
        useCase.execute(kpi.id, { unidad_medida_id: 4 }),
      ).rejects.toBeInstanceOf(ResourceNotFoundError);
      expect(update).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      nombre: 'cobertura incompleta',
      metasInvalidas: metas.slice(0, 1),
    },
    {
      nombre: 'operador verde inconsistente',
      metasInvalidas: [
        metas[0],
        {
          ...metas[1],
          operador_verde: '<=' as const,
          operador_amarillo: '<=' as const,
          valor_amarillo: 120,
        },
      ],
    },
    {
      nombre: 'semáforo incoherente',
      metasInvalidas: [{ ...metas[0], valor_amarillo: 120 }, metas[1]],
    },
  ])('lanza 409 por $nombre', async ({ metasInvalidas }) => {
    prepararBase();

    await expect(
      useCase.execute(kpi.id, { metas_por_anio: metasInvalidas }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(update).not.toHaveBeenCalled();
  });

  it('actualiza correctamente sin tocar metas si no se envían', async () => {
    prepararBase();
    update.mockResolvedValue(kpi);

    await expect(
      useCase.execute(kpi.id, { formula: 'Nueva fórmula' }),
    ).resolves.toBe(kpi);
    expect(update).toHaveBeenCalledWith(kpi.id, {
      objetivo_estrategico_id: undefined,
      nombre: undefined,
      formula: 'Nueva fórmula',
      frecuencia_id: undefined,
      unidad_medida_id: undefined,
      metas_por_anio: undefined,
    });
  });

  it('actualiza correctamente pasando todas las metas recibidas', async () => {
    prepararBase();
    update.mockResolvedValue(kpi);

    await expect(
      useCase.execute(kpi.id, { metas_por_anio: metas }),
    ).resolves.toBe(kpi);
    expect(update).toHaveBeenCalledWith(
      kpi.id,
      expect.objectContaining({ metas_por_anio: metas }),
    );
  });
});
