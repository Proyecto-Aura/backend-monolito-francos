import { PeriodoEntity } from '../../../domain/entities';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { KpiValorRepository } from '../../../domain/repositories/kpi-valor.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PeriodoRepository } from '../../../domain/repositories/periodo.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { KpiEntityEnriquecido } from '../../../domain/repositories/types/kpi-repository.types';
import { KpiValorEntityEnriquecido } from '../../../domain/repositories/types/kpi-valor-repository.types';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { RegistrarKpiValorTiUseCase } from './registrar-kpi-valor-ti.use-case';

describe('RegistrarKpiValorTiUseCase', () => {
  const findKpiById = jest.fn();
  const kpiRepository = {
    findById: findKpiById,
  } as unknown as jest.Mocked<KpiRepository>;
  const upsert = jest.fn();
  const kpiValorRepository = {
    upsert,
  } as unknown as jest.Mocked<KpiValorRepository>;
  const findObjetivoActivoById = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivoById: findObjetivoActivoById,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;
  const findPlanActivoById = jest.fn();
  const planEstrategicoRepository = {
    findActivoById: findPlanActivoById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const findPeriodoById = jest.fn();
  const periodoRepository = {
    findById: findPeriodoById,
  } as unknown as jest.Mocked<PeriodoRepository>;
  const tipoModuloTi = { id: 8, codigo: 'TI', estado: true };
  const tipoModuloNeg = { id: 7, codigo: 'NEG', estado: true };
  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;
  const useCase = new RegistrarKpiValorTiUseCase(
    kpiRepository,
    tipoModuloRepository,
    kpiValorRepository,
    objetivoEstrategicoRepository,
    planEstrategicoRepository,
    periodoRepository,
  );

  const kpi = {
    id: 20,
    frecuencia_id: 3,
    estado: true,
    objetivo_estrategico: { id: 10 },
    metas_anuales: [{ anio: 2026, estado: true, meta: 100 }],
    semaforos: [
      {
        anio: 2026,
        color: 'VERDE',
        operador: '>=',
        valor_referencia: 100,
        estado: true,
      },
      {
        anio: 2026,
        color: 'AMARILLO',
        operador: '>=',
        valor_referencia: 80,
        estado: true,
      },
      {
        anio: 2026,
        color: 'ROJO',
        operador: '<',
        valor_referencia: 80,
        estado: true,
      },
    ],
  } as KpiEntityEnriquecido;
  const objetivo = {
    id: 10,
    plan_estrategico_id: 1,
    tipo_modulo_id: tipoModuloTi.id,
  } as ObjetivoEstrategicoEntityEnriquecido;
  const plan = {
    id: 1,
    estado_plan: { codigo: 'ACTIVO' },
  } as PlanEstrategicoEntityConEstado;
  const periodo = {
    id: 5,
    frecuencia_id: kpi.frecuencia_id,
    estado: true,
  } as PeriodoEntity;
  const dto = { anio: 2026, periodo_id: periodo.id, valor: 90 };
  const valorRegistrado = {
    id: 30,
    kpi_id: kpi.id,
    periodo,
  } as KpiValorEntityEnriquecido;

  const prepararBase = () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(plan);
    findPeriodoById.mockResolvedValue(periodo);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findTipoModuloByCodigo.mockResolvedValue(tipoModuloTi);
  });

  it.each([null, { ...kpi, estado: false }])(
    'lanza 404 si el KPI no existe o está inactivo',
    async (resultado) => {
      findKpiById.mockResolvedValue(resultado);
      await expect(useCase.execute(kpi.id, dto)).rejects.toThrow(
        new ResourceNotFoundError('KPI no encontrado'),
      );
      expect(findObjetivoActivoById).not.toHaveBeenCalled();
      expect(upsert).not.toHaveBeenCalled();
    },
  );

  it('lanza 404 si el objetivo no existe', async () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById.mockResolvedValue(null);
    await expect(useCase.execute(kpi.id, dto)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('lanza 404 si el objetivo es de Negocio', async () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById.mockResolvedValue({
      ...objetivo,
      tipo_modulo_id: tipoModuloNeg.id,
    });
    const resultado = useCase.execute(kpi.id, dto);

    await expect(resultado).rejects.toBeInstanceOf(ResourceNotFoundError);
    await expect(resultado).rejects.toMatchObject({
      statusCode: 404,
      message: 'KPI no encontrado',
    });
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('lanza 404 si el plan no existe', async () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(null);
    await expect(useCase.execute(kpi.id, dto)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findPeriodoById).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está Activo', async () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'BORRADOR' },
    });
    await expect(useCase.execute(kpi.id, dto)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(findPeriodoById).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it.each([null, { ...periodo, estado: false }])(
    'lanza 404 si el periodo no existe o está inactivo',
    async (resultado) => {
      findKpiById.mockResolvedValue(kpi);
      findObjetivoActivoById.mockResolvedValue(objetivo);
      findPlanActivoById.mockResolvedValue(plan);
      findPeriodoById.mockResolvedValue(resultado);
      await expect(useCase.execute(kpi.id, dto)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
      expect(upsert).not.toHaveBeenCalled();
    },
  );

  it('lanza 409 si el periodo no corresponde a la frecuencia del KPI', async () => {
    prepararBase();
    findPeriodoById.mockResolvedValue({ ...periodo, frecuencia_id: 99 });
    await expect(useCase.execute(kpi.id, dto)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it('lanza 404 si no existe una meta activa para el año', async () => {
    prepararBase();
    findKpiById.mockResolvedValue({ ...kpi, metas_anuales: [] });
    await expect(useCase.execute(kpi.id, dto)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it('registra correctamente el valor con el color calculado', async () => {
    prepararBase();
    upsert.mockResolvedValue(valorRegistrado);
    await expect(useCase.execute(kpi.id, dto)).resolves.toBe(valorRegistrado);
    expect(upsert).toHaveBeenCalledWith({
      kpi_id: kpi.id,
      anio: dto.anio,
      periodo_id: periodo.id,
      valor: dto.valor,
      semaforo_color: 'AMARILLO',
    });
  });
});
