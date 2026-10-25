import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { FrecuenciaMedicionRepository } from '../../../domain/repositories/frecuencia-medicion.repository';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { KpiEntityEnriquecido } from '../../../domain/repositories/types/kpi-repository.types';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { UnidadMedidaKpiRepository } from '../../../domain/repositories/unidad-medida-kpi.repository';
import { CreateKpiDto } from '../../dto/kpi-dtos/create-kpi.dto';
import { CreateKpiTiUseCase } from './create-kpi-ti.use-case';

describe('CreateKpiTiUseCase', () => {
  const existsByNombre = jest.fn();
  const create = jest.fn();
  const countByPlanYTipo = jest.fn();
  const kpiRepository = {
    existsByNombre,
    create,
    countByPlanYTipo,
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

  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;

  const useCase = new CreateKpiTiUseCase(
    kpiRepository,
    objetivoEstrategicoRepository,
    planEstrategicoRepository,
    frecuenciaMedicionRepository,
    unidadMedidaKpiRepository,
    tipoModuloRepository,
  );

  const plan = {
    id: 1,
    codigo: 'PE-0001',
    anio_inicio: 2026,
    anio_fin: 2027,
    estado: true,
    estado_plan: { id: 1, codigo: 'BORRADOR', estado: true },
  } as PlanEstrategicoEntityConEstado;
  const tipoModuloTi = { id: 8, codigo: 'TI', estado: true };
  const tipoModuloNeg = { id: 7, codigo: 'NEG', estado: true };
  const objetivo = {
    id: 10,
    plan_estrategico_id: plan.id,
    tipo_modulo_id: tipoModuloTi.id,
    estado: true,
  } as ObjetivoEstrategicoEntityEnriquecido;
  const frecuencia = { id: 3, estado: true };
  const unidad = { id: 4, estado: true };
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
  const dto = {
    objetivo_estrategico_id: objetivo.id,
    nombre: 'Rentabilidad',
    formula: 'Ingresos / costos',
    frecuencia_id: frecuencia.id,
    unidad_medida_id: unidad.id,
    metas_por_anio: metas,
  } as CreateKpiDto;
  const kpi = { id: 20, nombre: 'Rentabilidad' } as KpiEntityEnriquecido;

  const prepararHastaUnidad = () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(plan);
    findFrecuenciaById.mockResolvedValue(frecuencia);
    findUnidadById.mockResolvedValue(unidad);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findTipoModuloByCodigo.mockResolvedValue(tipoModuloTi);
  });

  it.each([null, { ...tipoModuloTi, estado: false }])(
    'lanza 404 si el tipo de módulo TI no existe o está inactivo',
    async (resultado) => {
      findTipoModuloByCodigo.mockResolvedValue(resultado);

      await expect(useCase.execute(dto)).rejects.toThrow(
        new ResourceNotFoundError('Tipo de módulo TI no encontrado'),
      );
      expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
      expect(findObjetivoActivoById).toHaveBeenCalledWith(
        dto.objetivo_estrategico_id,
      );
      expect(findPlanActivoById).not.toHaveBeenCalled();
      expect(countByPlanYTipo).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('lanza 404 si el objetivo no existe', async () => {
    findObjetivoActivoById.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toThrow(
      new ResourceNotFoundError('Objetivo estratégico no encontrado'),
    );
    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
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
    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 404 si el plan no existe', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toThrow(
      new ResourceNotFoundError('Plan estratégico no encontrado'),
    );
    expect(findFrecuenciaById).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está en Borrador', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'ACTIVO' },
    });

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(findFrecuenciaById).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it.each([null, { ...frecuencia, estado: false }])(
    'lanza 404 si la frecuencia no existe o está inactiva',
    async (resultado) => {
      findObjetivoActivoById.mockResolvedValue(objetivo);
      findPlanActivoById.mockResolvedValue(plan);
      findFrecuenciaById.mockResolvedValue(resultado);

      await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
      expect(findUnidadById).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    },
  );

  it.each([null, { ...unidad, estado: false }])(
    'lanza 404 si la unidad de medida no existe o está inactiva',
    async (resultado) => {
      findObjetivoActivoById.mockResolvedValue(objetivo);
      findPlanActivoById.mockResolvedValue(plan);
      findFrecuenciaById.mockResolvedValue(frecuencia);
      findUnidadById.mockResolvedValue(resultado);

      await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
      expect(existsByNombre).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('lanza 409 si ya existe un KPI con ese nombre en el objetivo', async () => {
    prepararHastaUnidad();
    existsByNombre.mockResolvedValue(true);

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    { nombre: 'un año de menos', metasInvalidas: metas.slice(0, 1) },
    {
      nombre: 'un año de más',
      metasInvalidas: [...metas, { ...metas[1], anio: 2028 }],
    },
  ])('lanza 409 si las metas tienen $nombre', async ({ metasInvalidas }) => {
    prepararHastaUnidad();
    existsByNombre.mockResolvedValue(false);

    await expect(
      useCase.execute({ ...dto, metas_por_anio: metasInvalidas }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si los operadores verdes no son iguales', async () => {
    prepararHastaUnidad();
    existsByNombre.mockResolvedValue(false);

    await expect(
      useCase.execute({
        ...dto,
        metas_por_anio: [
          metas[0],
          {
            ...metas[1],
            operador_verde: '<=',
            operador_amarillo: '<=',
            valor_amarillo: 120,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si el Amarillo es más exigente que el Verde', async () => {
    prepararHastaUnidad();
    existsByNombre.mockResolvedValue(false);

    await expect(
      useCase.execute({
        ...dto,
        metas_por_anio: [{ ...metas[0], valor_amarillo: 120 }, metas[1]],
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(create).not.toHaveBeenCalled();
  });

  it('crea correctamente normalizando el nombre y calculando el correlativo', async () => {
    prepararHastaUnidad();
    existsByNombre.mockResolvedValue(false);
    findTipoModuloByCodigo.mockResolvedValue(tipoModuloTi);
    countByPlanYTipo.mockResolvedValue(4);
    create.mockResolvedValue(kpi);

    await expect(
      useCase.execute({ ...dto, nombre: '  Margen   operativo  ' }),
    ).resolves.toBe(kpi);
    expect(existsByNombre).toHaveBeenCalledWith(
      objetivo.id,
      'Margen operativo',
    );
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(countByPlanYTipo).toHaveBeenCalledWith(
      plan.id,
      objetivo.tipo_modulo_id,
    );
    expect(create).toHaveBeenCalledWith(
      {
        objetivo_estrategico_id: objetivo.id,
        frecuencia_id: frecuencia.id,
        unidad_medida_id: unidad.id,
        nombre: 'Margen operativo',
        formula: dto.formula,
        metas_por_anio: metas,
      },
      plan.codigo,
      '005',
      'TI',
    );
  });
});
