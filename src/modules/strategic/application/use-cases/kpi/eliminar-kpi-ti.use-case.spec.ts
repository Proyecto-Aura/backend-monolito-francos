import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { KpiValorRepository } from '../../../domain/repositories/kpi-valor.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { KpiEntityEnriquecido } from '../../../domain/repositories/types/kpi-repository.types';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { EliminarKpiTiUseCase } from './eliminar-kpi-ti.use-case';

describe('EliminarKpiTiUseCase', () => {
  const findKpiById = jest.fn();
  const setEstado = jest.fn();
  const kpiRepository = {
    findById: findKpiById,
    setEstado,
  } as unknown as jest.Mocked<KpiRepository>;
  const existsActivosByKpi = jest.fn();
  const kpiValorRepository = {
    existsActivosByKpi,
  } as unknown as jest.Mocked<KpiValorRepository>;
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
  const useCase = new EliminarKpiTiUseCase(
    kpiRepository,
    tipoModuloRepository,
    kpiValorRepository,
    objetivoEstrategicoRepository,
    planEstrategicoRepository,
  );

  const kpi = {
    id: 20,
    estado: true,
    objetivo_estrategico: { id: 10, tipo_modulo_id: tipoModuloTi.id },
  } as KpiEntityEnriquecido;
  const objetivo = {
    id: 10,
    plan_estrategico_id: 1,
  } as ObjetivoEstrategicoEntityEnriquecido;
  const plan = {
    id: 1,
    estado_plan: { codigo: 'BORRADOR' },
  } as PlanEstrategicoEntityConEstado;

  const prepararBase = () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(plan);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findTipoModuloByCodigo.mockResolvedValue(tipoModuloTi);
  });

  it.each([null, { ...kpi, estado: false }])(
    'lanza 404 si el KPI no existe o está inactivo',
    async (resultado) => {
      findKpiById.mockResolvedValue(resultado);
      await expect(useCase.execute(kpi.id)).rejects.toThrow(
        new ResourceNotFoundError('KPI no encontrado'),
      );
      expect(findObjetivoActivoById).not.toHaveBeenCalled();
      expect(setEstado).not.toHaveBeenCalled();
    },
  );

  it('lanza 404 si el KPI es de Negocio', async () => {
    findKpiById.mockResolvedValue({
      ...kpi,
      objetivo_estrategico: {
        ...kpi.objetivo_estrategico,
        tipo_modulo_id: tipoModuloNeg.id,
      },
    });
    const resultado = useCase.execute(kpi.id);

    await expect(resultado).rejects.toBeInstanceOf(ResourceNotFoundError);
    await expect(resultado).rejects.toMatchObject({
      statusCode: 404,
      message: 'KPI no encontrado',
    });
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(findObjetivoActivoById).not.toHaveBeenCalled();
    expect(existsActivosByKpi).not.toHaveBeenCalled();
    expect(setEstado).not.toHaveBeenCalled();
  });

  it('lanza 404 si el objetivo no existe', async () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById.mockResolvedValue(null);
    await expect(useCase.execute(kpi.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(setEstado).not.toHaveBeenCalled();
  });

  it('lanza 404 si el plan no existe', async () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(null);
    await expect(useCase.execute(kpi.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(existsActivosByKpi).not.toHaveBeenCalled();
    expect(setEstado).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está en Borrador', async () => {
    findKpiById.mockResolvedValue(kpi);
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'ACTIVO' },
    });
    await expect(useCase.execute(kpi.id)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(existsActivosByKpi).not.toHaveBeenCalled();
    expect(setEstado).not.toHaveBeenCalled();
  });

  it('lanza 409 si el KPI tiene valores de progreso activos', async () => {
    prepararBase();
    existsActivosByKpi.mockResolvedValue(true);
    await expect(useCase.execute(kpi.id)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(setEstado).not.toHaveBeenCalled();
  });

  it('elimina correctamente el KPI mediante borrado lógico', async () => {
    prepararBase();
    existsActivosByKpi.mockResolvedValue(false);
    const eliminado = { ...kpi, estado: false } as KpiEntityEnriquecido;
    setEstado.mockResolvedValue(eliminado);
    await expect(useCase.execute(kpi.id)).resolves.toBe(eliminado);
    expect(setEstado).toHaveBeenCalledWith(kpi.id, false);
  });
});
