import {
  EstadoIniciativaEntity,
  EstadoPlanEstrategicoEntity,
  FrecuenciaMedicionEntity,
  IniciativaEntity,
  KpiEntity,
  KpiMetaAnualEntity,
  KpiValorEntity,
  PeriodoEntity,
  PerspectivaBscEntity,
  PlanEstrategicoEntity,
  UnidadMedidaKpiEntity,
} from '../../domain/entities';
import { IniciativaEntityEnriquecido } from '../../domain/repositories/types/iniciativa-repository.types';
import { KpiEntityEnriquecido } from '../../domain/repositories/types/kpi-repository.types';
import { KpiValorEntityEnriquecido } from '../../domain/repositories/types/kpi-valor-repository.types';
import { TableroControlPresenter } from './tablero-control.presenter';

describe('TableroControlPresenter', () => {
  const fecha = new Date('2026-01-01T00:00:00.000Z');
  const plan = Object.assign(
    new PlanEstrategicoEntity(
      1,
      'PE-0001',
      'Plan estratégico 2026-2028',
      null,
      2026,
      2028,
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

  const makeKpi = (
    objetivoId: number,
    objetivoCodigo: string,
    perspectiva = financiera,
    metasAnuales: KpiMetaAnualEntity[] = [],
    valoresAnuales: KpiValorEntityEnriquecido[] = [],
    oeNegocio: { id: number; codigo: string; nombre: string } | null = null,
  ): KpiEntityEnriquecido =>
    Object.assign(
      new KpiEntity(
        objetivoId * 10,
        `KPI-${objetivoCodigo}`,
        objetivoId,
        1,
        1,
        `KPI del objetivo ${objetivoCodigo}`,
        'Ventas / meta',
        true,
        fecha,
        fecha,
      ),
      {
        frecuencia: new FrecuenciaMedicionEntity(
          1,
          'Mensual',
          12,
          1,
          true,
          fecha,
          fecha,
        ),
        unidad_medida: new UnidadMedidaKpiEntity(
          1,
          'Porcentaje',
          '%',
          2,
          true,
          fecha,
          fecha,
        ),
        metas_anuales: metasAnuales,
        semaforos: [],
        valores_anuales: valoresAnuales,
        objetivo_estrategico: {
          id: objetivoId,
          codigo: objetivoCodigo,
          nombre: `Objetivo ${objetivoCodigo}`,
          responsable: `Responsable ${objetivoCodigo}`,
          tipo_modulo_id: 1,
          oe_negocio_id: oeNegocio?.id ?? null,
          oe_negocio: oeNegocio,
          perspectiva_bsc: {
            id: perspectiva.id,
            nombre: perspectiva.nombre,
          },
        },
      },
    );

  const makeIniciativa = (
    objetivoId: number,
    objetivoCodigo: string,
    perspectiva = financiera,
    oeNegocio: { id: number; codigo: string; nombre: string } | null = null,
  ): IniciativaEntityEnriquecido =>
    Object.assign(
      new IniciativaEntity(
        objetivoId * 100,
        `INI-${objetivoCodigo}`,
        objetivoId,
        1,
        'Responsable iniciativa',
        `Iniciativa del objetivo ${objetivoCodigo}`,
        null,
        1000,
        null,
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-12-31T00:00:00.000Z'),
        true,
        fecha,
        fecha,
      ),
      {
        estado_iniciativa: new EstadoIniciativaEntity(
          1,
          'PLANIFICADA',
          'Planificada',
          1,
          true,
        ),
        objetivo_estrategico: {
          id: objetivoId,
          codigo: objetivoCodigo,
          nombre: `Objetivo ${objetivoCodigo}`,
          responsable: `Responsable ${objetivoCodigo}`,
          tipo_modulo_id: 1,
          oe_negocio_id: oeNegocio?.id ?? null,
          oe_negocio: oeNegocio,
          perspectiva_bsc: {
            id: perspectiva.id,
            nombre: perspectiva.nombre,
          },
        },
      },
    );

  const toHttp = (
    perspectivas: PerspectivaBscEntity[],
    kpis: KpiEntityEnriquecido[] = [],
    iniciativas: IniciativaEntityEnriquecido[] = [],
  ) =>
    TableroControlPresenter.toHttp({ plan, perspectivas, kpis, iniciativas });

  it('ordena las perspectivas por orden', () => {
    const http = toHttp([clientes, financiera]);

    expect(http.perspectivas.map((perspectiva) => perspectiva.id)).toEqual([
      financiera.id,
      clientes.id,
    ]);
  });

  it('incluye una perspectiva sin objetivos, KPIs ni iniciativas', () => {
    const http = toHttp([financiera]);

    expect(http.perspectivas[0].objetivos).toEqual([]);
  });

  it('incluye un objetivo con iniciativas y sin KPIs', () => {
    const http = toHttp([financiera], [], [makeIniciativa(1, 'OE-001')]);

    expect(http.perspectivas[0].objetivos[0].iniciativas).toHaveLength(1);
    expect(http.perspectivas[0].objetivos[0].kpis).toEqual([]);
  });

  it('incluye un objetivo con KPIs y sin iniciativas', () => {
    const http = toHttp([financiera], [makeKpi(1, 'OE-001')]);

    expect(http.perspectivas[0].objetivos[0].kpis).toHaveLength(1);
    expect(http.perspectivas[0].objetivos[0].iniciativas).toEqual([]);
  });

  it('ordena los objetivos de una perspectiva por código', () => {
    const http = toHttp(
      [financiera],
      [makeKpi(2, 'OE-002'), makeKpi(1, 'OE-001')],
    );

    expect(
      http.perspectivas[0].objetivos.map((objetivo) => objetivo.codigo),
    ).toEqual(['OE-001', 'OE-002']);
  });

  it('genera valores para todos los años del plan en orden', () => {
    const http = toHttp([financiera], [makeKpi(1, 'OE-001')]);

    expect(
      http.perspectivas[0].objetivos[0].kpis[0].valores_por_anio.map(
        (valor) => valor.anio,
      ),
    ).toEqual([2026, 2027, 2028]);
  });

  it('usa valores nulos cuando un año no tiene meta ni valor', () => {
    const http = toHttp([financiera], [makeKpi(1, 'OE-001')]);

    expect(
      http.perspectivas[0].objetivos[0].kpis[0].valores_por_anio[0],
    ).toEqual({
      anio: 2026,
      meta: null,
      periodo: null,
      valor: null,
      semaforo_color: null,
    });
  });

  it('arma la meta, valor, periodo y semáforo del año registrado', () => {
    const meta = new KpiMetaAnualEntity(1, 10, 2027, 85, true, fecha, fecha);
    const periodo = new PeriodoEntity(
      12,
      1,
      12,
      'DIC',
      'Diciembre',
      12,
      true,
      fecha,
      fecha,
    );
    const valor = Object.assign(
      new KpiValorEntity(
        1,
        10,
        2027,
        periodo.id,
        90,
        'VERDE',
        true,
        fecha,
        fecha,
      ),
      { periodo, color_hex: '#22C55E' },
    );
    const http = toHttp(
      [financiera],
      [makeKpi(1, 'OE-001', financiera, [meta], [valor])],
    );

    expect(
      http.perspectivas[0].objetivos[0].kpis[0].valores_por_anio[1],
    ).toEqual({
      anio: 2027,
      meta: 85,
      periodo: { id: 12, codigo: 'DIC', nombre: 'Diciembre' },
      valor: 90,
      semaforo_color: 'VERDE',
    });
  });

  it('expone exactamente los campos requeridos del plan', () => {
    const http = toHttp([]);

    expect(http.plan).toEqual({
      id: 1,
      codigo: 'PE-0001',
      nombre: 'Plan estratégico 2026-2028',
      anio_inicio: 2026,
      anio_fin: 2028,
      estado_plan: { codigo: 'ACTIVO', nombre: 'Activo' },
    });
  });

  it('toHttp no expone oe_negocio ni oe_negocio_id aunque estén seteados en el dominio', () => {
    const oeNegocio = {
      id: 5,
      codigo: 'ON-001',
      nombre: 'Objetivo de negocio',
    };
    const http = toHttp(
      [financiera],
      [makeKpi(1, 'OE-001', financiera, [], [], oeNegocio)],
      [makeIniciativa(2, 'OE-002', financiera, oeNegocio)],
    );

    for (const objetivoHttp of http.perspectivas[0].objetivos) {
      expect(Object.keys(objetivoHttp)).not.toContain('oe_negocio');
      expect(Object.keys(objetivoHttp)).not.toContain('oe_negocio_id');
    }
  });

  it('toHttpTi expone oe_negocio_id y oe_negocio cuando están seteados', () => {
    const oeNegocio = {
      id: 5,
      codigo: 'ON-001',
      nombre: 'Objetivo de negocio',
    };
    const http = TableroControlPresenter.toHttpTi({
      plan,
      perspectivas: [financiera],
      kpis: [makeKpi(1, 'OE-001', financiera, [], [], oeNegocio)],
      iniciativas: [makeIniciativa(2, 'OE-002', financiera, oeNegocio)],
    });

    for (const objetivoHttp of http.perspectivas[0].objetivos) {
      expect(objetivoHttp).toMatchObject({
        oe_negocio_id: 5,
        oe_negocio: {
          id: 5,
          codigo: 'ON-001',
          nombre: 'Objetivo de negocio',
        },
      });
    }
  });

  it('toHttpTi expone oe_negocio_id y oe_negocio nulos cuando no hay vínculo', () => {
    const http = TableroControlPresenter.toHttpTi({
      plan,
      perspectivas: [financiera],
      kpis: [makeKpi(1, 'OE-001')],
      iniciativas: [makeIniciativa(2, 'OE-002')],
    });

    for (const objetivoHttp of http.perspectivas[0].objetivos) {
      expect(objetivoHttp).toMatchObject({
        oe_negocio_id: null,
        oe_negocio: null,
      });
    }
  });

  it('toHttpTi es exactamente toHttp más oe_negocio_id y oe_negocio por objetivo', () => {
    const oeNegocio = {
      id: 5,
      codigo: 'ON-001',
      nombre: 'Objetivo de negocio',
    };
    const meta = new KpiMetaAnualEntity(1, 10, 2027, 85, true, fecha, fecha);
    const periodo = new PeriodoEntity(
      12,
      1,
      12,
      'DIC',
      'Diciembre',
      12,
      true,
      fecha,
      fecha,
    );
    const valor = Object.assign(
      new KpiValorEntity(
        1,
        10,
        2027,
        periodo.id,
        90,
        'VERDE',
        true,
        fecha,
        fecha,
      ),
      { periodo, color_hex: '#22C55E' },
    );
    const input = {
      plan,
      perspectivas: [clientes, financiera],
      kpis: [makeKpi(1, 'OE-001', financiera, [meta], [valor], oeNegocio)],
      iniciativas: [
        makeIniciativa(1, 'OE-001', financiera, oeNegocio),
        makeIniciativa(2, 'OE-002', clientes, oeNegocio),
      ],
    };
    const http = TableroControlPresenter.toHttp(input);
    const httpTi = TableroControlPresenter.toHttpTi(input);

    expect({
      ...httpTi,
      perspectivas: httpTi.perspectivas.map((perspectiva) => ({
        ...perspectiva,
        objetivos: perspectiva.objetivos.map((objetivoTi) => ({
          ...objetivoTi,
          oe_negocio_id: undefined,
          oe_negocio: undefined,
        })),
      })),
    }).toEqual(http);
  });
});
