import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { KpiValorRepository } from '../../../domain/repositories/kpi-valor.repository';
import { KpiEntityEnriquecido } from '../../../domain/repositories/types/kpi-repository.types';
import { KpiValorEntityEnriquecido } from '../../../domain/repositories/types/kpi-valor-repository.types';
import { ObtenerUltimoKpiValorTiUseCase } from './obtener-ultimo-kpi-valor-ti.use-case';

describe('ObtenerUltimoKpiValorTiUseCase', () => {
  const findKpiById = jest.fn();
  const kpiRepository = {
    findById: findKpiById,
  } as unknown as jest.Mocked<KpiRepository>;
  const findUltimoByKpi = jest.fn();
  const kpiValorRepository = {
    findUltimoByKpi,
  } as unknown as jest.Mocked<KpiValorRepository>;
  const tipoModuloTi = { id: 8, codigo: 'TI', estado: true };
  const tipoModuloNeg = { id: 7, codigo: 'NEG', estado: true };
  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;
  const useCase = new ObtenerUltimoKpiValorTiUseCase(
    kpiRepository,
    tipoModuloRepository,
    kpiValorRepository,
  );
  const kpi = {
    id: 20,
    estado: true,
    objetivo_estrategico: { tipo_modulo_id: tipoModuloTi.id },
  } as KpiEntityEnriquecido;

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
      expect(findUltimoByKpi).not.toHaveBeenCalled();
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
    expect(findUltimoByKpi).not.toHaveBeenCalled();
  });

  it('retorna correctamente el último valor del KPI', async () => {
    const ultimo = { id: 1 } as KpiValorEntityEnriquecido;
    findKpiById.mockResolvedValue(kpi);
    findUltimoByKpi.mockResolvedValue(ultimo);
    await expect(useCase.execute(kpi.id)).resolves.toBe(ultimo);
    expect(findUltimoByKpi).toHaveBeenCalledWith(kpi.id);
  });

  it('retorna null si el KPI no tiene registros', async () => {
    findKpiById.mockResolvedValue(kpi);
    findUltimoByKpi.mockResolvedValue(null);
    await expect(useCase.execute(kpi.id)).resolves.toBeNull();
    expect(findUltimoByKpi).toHaveBeenCalledWith(kpi.id);
  });
});
