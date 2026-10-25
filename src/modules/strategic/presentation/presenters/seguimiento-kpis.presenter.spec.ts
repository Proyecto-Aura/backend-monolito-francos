import {
  EstadoPlanEstrategicoEntity,
  FrecuenciaMedicionEntity,
  KpiEntity,
  KpiMetaAnualEntity,
  KpiValorEntity,
  PeriodoEntity,
  PerspectivaBscEntity,
  PlanEstrategicoEntity,
  SemaforoConfigEntity,
  UnidadMedidaKpiEntity,
} from '../../domain/entities';
import { KpiSeguimientoEntidad } from '../../domain/repositories/types/kpi-repository.types';
import { KpiValorEntityEnriquecido } from '../../domain/repositories/types/kpi-valor-repository.types';
import { SeguimientoKpisPresenter } from './seguimiento-kpis.presenter';

describe('SeguimientoKpisPresenter', () => {
  const fecha = new Date('2024-01-01T00:00:00.000Z');
  const plan = Object.assign(
    new PlanEstrategicoEntity(
      1,
      'PE-0001',
      'Plan estratégico 2024-2025',
      null,
      2024,
      2025,
      2,
      true,
      fecha,
      fecha,
    ),
    {
      estado_plan: new EstadoPlanEstrategicoEntity(
        2,
        'ACTIVO',
        'Activo',
        2,
        true,
      ),
    },
  );
  const financiera = new PerspectivaBscEntity(1, 'Financiera', null, 1, true);
  const clientes = new PerspectivaBscEntity(2, 'Clientes', null, 2, true);
  const frecuenciaTrimestral = new FrecuenciaMedicionEntity(
    1,
    'Trimestral',
    4,
    2,
    true,
    fecha,
    fecha,
  );
  const unidadMedida = new UnidadMedidaKpiEntity(
    1,
    'Unidades',
    'u',
    2,
    true,
    fecha,
    fecha,
  );
  const t1 = new PeriodoEntity(
    1,
    frecuenciaTrimestral.id,
    1,
    'T1',
    'Trimestre 1',
    3,
    true,
    fecha,
    fecha,
  );
  const t2 = new PeriodoEntity(
    2,
    frecuenciaTrimestral.id,
    2,
    'T2',
    'Trimestre 2',
    6,
    true,
    fecha,
    fecha,
  );
  const t3 = new PeriodoEntity(
    3,
    frecuenciaTrimestral.id,
    3,
    'T3',
    'Trimestre 3',
    9,
    true,
    fecha,
    fecha,
  );
  const t4 = new PeriodoEntity(
    4,
    frecuenciaTrimestral.id,
    4,
    'T4',
    'Trimestre 4',
    12,
    true,
    fecha,
    fecha,
  );
  const periodosPorFrecuencia = new Map<number, PeriodoEntity[]>([
    [frecuenciaTrimestral.id, [t4, t2, t1, t3]],
  ]);

  const makeValor = (
    kpiId: number,
    anio: number,
    periodo: PeriodoEntity,
    valor: number,
    semaforoColor: string,
  ): KpiValorEntityEnriquecido =>
    Object.assign(
      new KpiValorEntity(
        kpiId * 100 + anio + periodo.numero,
        kpiId,
        anio,
        periodo.id,
        valor,
        semaforoColor,
        true,
        fecha,
        fecha,
      ),
      { periodo, color_hex: '#000000' },
    );

  const makeKpi = ({
    id,
    objetivoId = id,
    objetivoCodigo = `OE-${String(id).padStart(3, '0')}`,
    perspectiva = financiera,
    operador = '>=',
    meta2024 = 8,
    meta2025 = 8,
    historial = [],
  }: {
    id: number;
    objetivoId?: number;
    objetivoCodigo?: string;
    perspectiva?: PerspectivaBscEntity;
    operador?: '>=' | '<=';
    meta2024?: number;
    meta2025?: number;
    historial?: KpiValorEntityEnriquecido[];
  }): KpiSeguimientoEntidad => {
    const metasAnuales = [
      new KpiMetaAnualEntity(
        id * 10 + 1,
        id,
        2024,
        meta2024,
        true,
        fecha,
        fecha,
      ),
      new KpiMetaAnualEntity(
        id * 10 + 2,
        id,
        2025,
        meta2025,
        true,
        fecha,
        fecha,
      ),
    ];
    const semaforos = [
      new SemaforoConfigEntity(
        id * 10 + 3,
        id,
        2024,
        'VERDE',
        '#22C55E',
        operador,
        meta2024,
        true,
        fecha,
        fecha,
      ),
    ];

    return Object.assign(
      new KpiEntity(
        id,
        `KPI-${String(id).padStart(3, '0')}`,
        objetivoId,
        frecuenciaTrimestral.id,
        unidadMedida.id,
        `KPI ${id}`,
        'Resultado / meta',
        true,
        fecha,
        fecha,
      ),
      {
        frecuencia: frecuenciaTrimestral,
        unidad_medida: unidadMedida,
        metas_anuales: metasAnuales,
        semaforos,
        valores_anuales: [],
        objetivo_estrategico: {
          id: objetivoId,
          codigo: objetivoCodigo,
          nombre: `Objetivo ${objetivoCodigo}`,
          responsable: `Responsable ${objetivoCodigo}`,
          perspectiva_bsc: {
            id: perspectiva.id,
            nombre: perspectiva.nombre,
          },
        },
        historial,
        ultimo_valor:
          historial.length > 0 ? historial[historial.length - 1] : null,
      },
    );
  };

  const toHttp = (
    kpis: KpiSeguimientoEntidad[] = [],
    perspectivas: PerspectivaBscEntity[] = [financiera, clientes],
  ) =>
    SeguimientoKpisPresenter.toHttp({
      plan,
      perspectivas,
      kpis,
      periodosPorFrecuencia,
    });

  const primerKpiHttp = (kpi: KpiSeguimientoEntidad) =>
    toHttp([kpi], [financiera]).perspectivas[0].objetivos[0].kpis[0];

  it('ordena las perspectivas por orden', () => {
    const http = toHttp([], [clientes, financiera]);

    expect(http.perspectivas.map(({ id }) => id)).toEqual([
      financiera.id,
      clientes.id,
    ]);
  });

  it('incluye una perspectiva sin KPIs con objetivos y cumplimiento vacíos', () => {
    const http = toHttp([], [financiera]);

    expect(http.perspectivas[0]).toEqual({
      id: financiera.id,
      nombre: financiera.nombre,
      cumplimiento: {
        porcentaje_promedio: null,
        kpis_evaluados: 0,
        total_kpis: 0,
        kpis_verde: 0,
        kpis_amarillo: 0,
        kpis_rojo: 0,
        kpis_sin_dato: 0,
      },
      objetivos: [],
    });
  });

  it('ordena los objetivos de una perspectiva por código', () => {
    const http = toHttp(
      [
        makeKpi({ id: 2, objetivoId: 2, objetivoCodigo: 'OE-002' }),
        makeKpi({ id: 1, objetivoId: 1, objetivoCodigo: 'OE-001' }),
      ],
      [financiera],
    );

    expect(http.perspectivas[0].objetivos.map(({ codigo }) => codigo)).toEqual([
      'OE-001',
      'OE-002',
    ]);
  });

  it('expone null para el último valor y avance de un KPI sin dato', () => {
    const http = toHttp([makeKpi({ id: 1 })], [financiera]);
    const kpi = http.perspectivas[0].objetivos[0].kpis[0];

    expect(kpi.ultimo_valor).toBeNull();
    expect(kpi.avance_pct).toBeNull();
    expect(http.perspectivas[0].cumplimiento).toMatchObject({
      kpis_evaluados: 0,
      kpis_verde: 0,
      kpis_amarillo: 0,
      kpis_rojo: 0,
      kpis_sin_dato: 1,
    });
  });

  it('calcula el avance redondeado para un KPI con operador mayor o igual', () => {
    const valor = makeValor(1, 2025, t1, 7, 'AMARILLO');

    expect(
      primerKpiHttp(makeKpi({ id: 1, historial: [valor] })).avance_pct,
    ).toBe(88);
  });

  it('devuelve avance 100 cuando la meta es menor o igual a cero', () => {
    const valor = makeValor(1, 2025, t1, 5, 'VERDE');

    expect(
      primerKpiHttp(makeKpi({ id: 1, meta2025: 0, historial: [valor] }))
        .avance_pct,
    ).toBe(100);
  });

  it('devuelve avance 100 para operador menor o igual cuando el valor es cero', () => {
    const valor = makeValor(1, 2025, t1, 0, 'VERDE');

    expect(
      primerKpiHttp(
        makeKpi({ id: 1, operador: '<=', meta2025: 10, historial: [valor] }),
      ).avance_pct,
    ).toBe(100);
  });

  it('acota el avance a 100 cuando el valor supera ampliamente la meta', () => {
    const valor = makeValor(1, 2025, t1, 20, 'VERDE');

    expect(
      primerKpiHttp(makeKpi({ id: 1, meta2025: 10, historial: [valor] }))
        .avance_pct,
    ).toBe(100);
  });

  it('acota el avance a 0 cuando el resultado crudo es negativo', () => {
    const valor = makeValor(1, 2025, t1, -5, 'ROJO');

    expect(
      primerKpiHttp(makeKpi({ id: 1, meta2025: 10, historial: [valor] }))
        .avance_pct,
    ).toBe(0);
  });

  it('expone el operador de la fila Verde de los semáforos', () => {
    const kpi = makeKpi({ id: 1, operador: '<=' });

    expect(primerKpiHttp(kpi).operador).toBe('<=');
  });

  it('arma ocho puntos trimestrales ordenados con la meta anual y huecos nulos', () => {
    const serie = primerKpiHttp(
      makeKpi({ id: 1, meta2024: 4, meta2025: 8 }),
    ).serie;

    expect(serie).toHaveLength(8);
    expect(
      serie.map(({ anio, periodo }) => `${anio}-${periodo.codigo}`),
    ).toEqual([
      '2024-T1',
      '2024-T2',
      '2024-T3',
      '2024-T4',
      '2025-T1',
      '2025-T2',
      '2025-T3',
      '2025-T4',
    ]);
    expect(serie.slice(0, 4).map(({ meta }) => meta)).toEqual([4, 4, 4, 4]);
    expect(serie.slice(4).map(({ meta }) => meta)).toEqual([8, 8, 8, 8]);
    expect(
      serie.every(
        ({ valor, semaforo_color }) =>
          valor === null && semaforo_color === null,
      ),
    ).toBe(true);
  });

  it('incluye el valor, semáforo y periodo completo de un punto registrado', () => {
    const valor = makeValor(1, 2025, t3, 7, 'AMARILLO');
    const serie = primerKpiHttp(
      makeKpi({ id: 1, meta2025: 8, historial: [valor] }),
    ).serie;

    expect(
      serie.find(
        ({ anio, periodo }) => anio === 2025 && periodo.codigo === 'T3',
      ),
    ).toEqual({
      anio: 2025,
      periodo: {
        id: t3.id,
        codigo: 'T3',
        nombre: 'Trimestre 3',
        numero: 3,
      },
      valor: 7,
      meta: 8,
      semaforo_color: 'AMARILLO',
    });
  });

  it('agrega el cumplimiento general de todas las perspectivas', () => {
    const verde = makeKpi({
      id: 1,
      perspectiva: financiera,
      meta2025: 10,
      historial: [makeValor(1, 2025, t1, 10, 'VERDE')],
    });
    const sinDato = makeKpi({ id: 2, perspectiva: financiera });
    const amarillo = makeKpi({
      id: 3,
      perspectiva: clientes,
      meta2025: 10,
      historial: [makeValor(3, 2025, t1, 5, 'AMARILLO')],
    });
    const rojo = makeKpi({
      id: 4,
      perspectiva: clientes,
      meta2025: 10,
      historial: [makeValor(4, 2025, t1, -5, 'ROJO')],
    });

    const http = toHttp([verde, sinDato, amarillo, rojo]);

    expect(http.cumplimiento_general).toEqual({
      porcentaje_promedio: 50,
      kpis_evaluados: 3,
      total_kpis: 4,
      kpis_verde: 1,
      kpis_amarillo: 1,
      kpis_rojo: 1,
      kpis_sin_dato: 1,
    });
  });

  it('expone exactamente los campos requeridos del plan', () => {
    const http = toHttp();

    expect(http.plan).toEqual({
      id: 1,
      codigo: 'PE-0001',
      nombre: 'Plan estratégico 2024-2025',
    });
  });
});
