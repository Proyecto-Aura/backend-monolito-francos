import { SeguimientoKpisResultado } from '../../application/use-cases/seguimiento-kpis/obtener-seguimiento-kpis.use-case';
import { PeriodoEntity, PerspectivaBscEntity } from '../../domain/entities';
import { KpiSeguimientoEntidad } from '../../domain/repositories/types/kpi-repository.types';
import { KpiValorEntityEnriquecido } from '../../domain/repositories/types/kpi-valor-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../domain/repositories/types/plan-estrategico-repository.types';

type OperadorSeguimiento = '>=' | '<=';
type KpiSeguimientoConValor = KpiSeguimientoEntidad & {
  ultimo_valor: KpiValorEntityEnriquecido;
};

interface ObjetivoSeguimiento {
  id: number;
  codigo: string;
  nombre: string;
  responsable: string;
  oe_negocio_id: number | null;
  oe_negocio: { id: number; codigo: string; nombre: string } | null;
  kpis: KpiSeguimientoEntidad[];
}

export interface PuntoSerieSeguimiento {
  anio: number;
  periodo: {
    id: number;
    codigo: string;
    nombre: string;
    numero: number;
  };
  valor: number | null;
  meta: number | null;
  semaforo_color: string | null;
}

export class SeguimientoKpisPresenter {
  static toHttp({
    plan,
    perspectivas,
    kpis,
    periodosPorFrecuencia,
  }: SeguimientoKpisResultado) {
    return this.construir(
      plan,
      perspectivas,
      kpis,
      periodosPorFrecuencia,
      (objetivo) => this.objetivoToHttp(objetivo),
    );
  }

  static toHttpTi({
    plan,
    perspectivas,
    kpis,
    periodosPorFrecuencia,
  }: SeguimientoKpisResultado) {
    return this.construir(
      plan,
      perspectivas,
      kpis,
      periodosPorFrecuencia,
      (objetivo) => this.objetivoToHttpTi(objetivo),
    );
  }

  private static construir(
    plan: PlanEstrategicoEntityConEstado,
    perspectivas: PerspectivaBscEntity[],
    kpis: KpiSeguimientoEntidad[],
    periodosPorFrecuencia: Map<number, PeriodoEntity[]>,
    presentarObjetivo: (
      objetivo: ObjetivoSeguimiento,
    ) => ReturnType<typeof SeguimientoKpisPresenter.objetivoToHttp>,
  ) {
    return {
      plan: { id: plan.id, codigo: plan.codigo, nombre: plan.nombre },
      cumplimiento_general: this.calcularCumplimiento(kpis),
      perspectivas: [...perspectivas]
        .sort((a, b) => a.orden - b.orden)
        .map((perspectiva) => {
          const kpisDeLaPerspectiva = kpis.filter(
            (kpi) =>
              kpi.objetivo_estrategico.perspectiva_bsc.id === perspectiva.id,
          );

          return {
            id: perspectiva.id,
            nombre: perspectiva.nombre,
            cumplimiento: this.calcularCumplimiento(kpisDeLaPerspectiva),
            objetivos: this.objetivosDeLaPerspectiva(
              kpisDeLaPerspectiva,
              plan,
              periodosPorFrecuencia,
              presentarObjetivo,
            ),
          };
        }),
    };
  }

  private static objetivoToHttp(objetivo: ObjetivoSeguimiento) {
    return {
      id: objetivo.id,
      codigo: objetivo.codigo,
      nombre: objetivo.nombre,
      responsable: objetivo.responsable,
    };
  }

  private static objetivoToHttpTi(objetivo: ObjetivoSeguimiento) {
    return {
      ...this.objetivoToHttp(objetivo),
      oe_negocio_id: objetivo.oe_negocio_id,
      oe_negocio: objetivo.oe_negocio,
    };
  }

  private static objetivosDeLaPerspectiva(
    kpisDeLaPerspectiva: KpiSeguimientoEntidad[],
    plan: PlanEstrategicoEntityConEstado,
    periodosPorFrecuencia: Map<number, PeriodoEntity[]>,
    presentarObjetivo: (
      objetivo: ObjetivoSeguimiento,
    ) => ReturnType<typeof SeguimientoKpisPresenter.objetivoToHttp>,
  ) {
    const objetivos = new Map<number, ObjetivoSeguimiento>();

    for (const kpi of kpisDeLaPerspectiva) {
      const objetivo = kpi.objetivo_estrategico;

      if (!objetivos.has(objetivo.id)) {
        objetivos.set(objetivo.id, {
          id: objetivo.id,
          codigo: objetivo.codigo,
          nombre: objetivo.nombre,
          responsable: objetivo.responsable,
          oe_negocio_id: objetivo.oe_negocio_id,
          oe_negocio: objetivo.oe_negocio,
          kpis: [],
        });
      }

      objetivos.get(objetivo.id)?.kpis.push(kpi);
    }

    return [...objetivos.values()]
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
      .map((objetivo) => ({
        ...presentarObjetivo(objetivo),
        kpis: objetivo.kpis.map((kpi) =>
          this.kpiToHttp(kpi, plan, periodosPorFrecuencia),
        ),
      }));
  }

  private static kpiToHttp(
    kpi: KpiSeguimientoEntidad,
    plan: PlanEstrategicoEntityConEstado,
    periodosPorFrecuencia: Map<number, PeriodoEntity[]>,
  ) {
    const operador = this.operadorDelKpi(kpi);
    const ultimoValor = kpi.ultimo_valor;
    const metaDelUltimoAnio = ultimoValor
      ? kpi.metas_anuales.find((meta) => meta.anio === ultimoValor.anio)
      : undefined;
    const avancePct =
      ultimoValor && metaDelUltimoAnio
        ? this.calcularAvancePct(
            ultimoValor.valor,
            metaDelUltimoAnio.meta,
            operador,
          )
        : null;

    return {
      id: kpi.id,
      codigo: kpi.codigo,
      nombre: kpi.nombre,
      formula: kpi.formula,
      unidad_medida: {
        nombre: kpi.unidad_medida.nombre,
        simbolo: kpi.unidad_medida.simbolo,
      },
      frecuencia: { nombre: kpi.frecuencia.nombre },
      operador,
      ultimo_valor: ultimoValor
        ? {
            anio: ultimoValor.anio,
            periodo: {
              id: ultimoValor.periodo.id,
              codigo: ultimoValor.periodo.codigo,
              nombre: ultimoValor.periodo.nombre,
            },
            valor: ultimoValor.valor,
            semaforo_color: ultimoValor.semaforo_color,
          }
        : null,
      avance_pct: avancePct,
      metas_anuales: [...kpi.metas_anuales]
        .sort((a, b) => a.anio - b.anio)
        .map((meta) => ({ anio: meta.anio, meta: meta.meta })),
      serie: this.serieCompleta(kpi, plan, periodosPorFrecuencia),
    };
  }

  private static serieCompleta(
    kpi: KpiSeguimientoEntidad,
    plan: PlanEstrategicoEntityConEstado,
    periodosPorFrecuencia: Map<number, PeriodoEntity[]>,
  ): PuntoSerieSeguimiento[] {
    const periodos = [
      ...(periodosPorFrecuencia.get(kpi.frecuencia.id) ?? []),
    ].sort((a, b) => a.numero - b.numero);
    const serie: PuntoSerieSeguimiento[] = [];

    for (let anio = plan.anio_inicio; anio <= plan.anio_fin; anio++) {
      const meta =
        kpi.metas_anuales.find((item) => item.anio === anio)?.meta ?? null;

      for (const periodo of periodos) {
        const punto = kpi.historial.find(
          (item) => item.anio === anio && item.periodo.id === periodo.id,
        );
        serie.push({
          anio,
          periodo: {
            id: periodo.id,
            codigo: periodo.codigo,
            nombre: periodo.nombre,
            numero: periodo.numero,
          },
          valor: punto?.valor ?? null,
          meta,
          semaforo_color: punto?.semaforo_color ?? null,
        });
      }
    }

    return serie;
  }

  private static calcularCumplimiento(kpis: KpiSeguimientoEntidad[]) {
    const kpisConValor = kpis.filter(
      (kpi): kpi is KpiSeguimientoConValor => kpi.ultimo_valor !== null,
    );
    const avances = kpisConValor
      .map((kpi) => {
        const operador = this.operadorDelKpi(kpi);
        const meta = kpi.metas_anuales.find(
          (item) => item.anio === kpi.ultimo_valor.anio,
        )?.meta;

        return meta === undefined
          ? null
          : this.calcularAvancePct(kpi.ultimo_valor.valor, meta, operador);
      })
      .filter((avance): avance is number => avance !== null);

    return {
      porcentaje_promedio:
        avances.length > 0
          ? Math.round(
              avances.reduce((acumulado, avance) => acumulado + avance, 0) /
                avances.length,
            )
          : null,
      kpis_evaluados: kpisConValor.length,
      total_kpis: kpis.length,
      kpis_verde: kpisConValor.filter(
        (kpi) => kpi.ultimo_valor.semaforo_color === 'VERDE',
      ).length,
      kpis_amarillo: kpisConValor.filter(
        (kpi) => kpi.ultimo_valor.semaforo_color === 'AMARILLO',
      ).length,
      kpis_rojo: kpisConValor.filter(
        (kpi) => kpi.ultimo_valor.semaforo_color === 'ROJO',
      ).length,
      kpis_sin_dato: kpis.length - kpisConValor.length,
    };
  }

  private static operadorDelKpi(
    kpi: KpiSeguimientoEntidad,
  ): OperadorSeguimiento {
    const operador = kpi.semaforos.find(
      (semaforo) => semaforo.color === 'VERDE',
    )?.operador;

    return operador === '<=' ? '<=' : '>=';
  }

  private static calcularAvancePct(
    valor: number,
    meta: number,
    operador: OperadorSeguimiento,
  ) {
    if (operador === '>=') {
      if (meta <= 0) return 100;
      return Math.max(0, Math.min(100, Math.round((valor / meta) * 100)));
    }

    if (valor <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round((meta / valor) * 100)));
  }
}
