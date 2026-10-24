import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { KpiEntityEnriquecido } from '../../../domain/repositories/types/kpi-repository.types';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { ListKpisPorObjetivoTiUseCase } from './list-kpis-por-objetivo-ti.use-case';

describe('ListKpisPorObjetivoTiUseCase', () => {
  const findByObjetivo = jest.fn();
  const kpiRepository = {
    findByObjetivo,
  } as unknown as jest.Mocked<KpiRepository>;
  const findObjetivoActivoById = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivoById: findObjetivoActivoById,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;
  const tipoModuloTi = { id: 8, codigo: 'TI', estado: true };
  const tipoModuloNeg = { id: 7, codigo: 'NEG', estado: true };
  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;
  const useCase = new ListKpisPorObjetivoTiUseCase(
    kpiRepository,
    tipoModuloRepository,
    objetivoEstrategicoRepository,
  );
  const objetivo = {
    id: 10,
    tipo_modulo_id: tipoModuloTi.id,
  } as ObjetivoEstrategicoEntityEnriquecido;
  const dto = {
    objetivo_estrategico_id: objetivo.id,
    page: 2,
    limit: 5,
    search: 'margen',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findTipoModuloByCodigo.mockResolvedValue(tipoModuloTi);
  });

  it('lanza 404 si el objetivo no existe', async () => {
    findObjetivoActivoById.mockResolvedValue(null);
    await expect(useCase.execute(dto)).rejects.toThrow(
      new ResourceNotFoundError('Objetivo estratégico no encontrado'),
    );
    expect(findByObjetivo).not.toHaveBeenCalled();
  });

  it('lanza 404 si el objetivo es de Negocio', async () => {
    findObjetivoActivoById.mockResolvedValue({
      ...objetivo,
      tipo_modulo_id: tipoModuloNeg.id,
    });
    const resultado = useCase.execute(dto);

    await expect(resultado).rejects.toBeInstanceOf(ResourceNotFoundError);
    await expect(resultado).rejects.toMatchObject({
      statusCode: 404,
      message: 'Objetivo estratégico no encontrado',
    });
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(findByObjetivo).not.toHaveBeenCalled();
  });

  it('lista correctamente los KPIs paginados del objetivo', async () => {
    const resultado = {
      data: [{ id: 20 } as KpiEntityEnriquecido],
      total: 1,
      page: 2,
      limit: 5,
    };
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findByObjetivo.mockResolvedValue(resultado);
    await expect(useCase.execute(dto)).resolves.toBe(resultado);
    expect(findByObjetivo).toHaveBeenCalledWith({
      objetivo_estrategico_id: objetivo.id,
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
    });
  });
});
