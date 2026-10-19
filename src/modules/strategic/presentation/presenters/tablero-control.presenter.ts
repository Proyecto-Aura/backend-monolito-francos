import { TableroControlResultado } from '../../application/use-cases/tablero-control/obtener-tablero-control.use-case';
import { IniciativaEntityEnriquecido } from '../../domain/repositories/types/iniciativa-repository.types';
import { KpiEntityEnriquecido } from '../../domain/repositories/types/kpi-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../domain/repositories/types/plan-estrategico-repository.types';
import { IniciativaPresenter } from './iniciativa.presenter';

interface ObjetivoTablero {
  id: number;
  codigo: string;
  nombre: string;
  responsable: string;
  perspectiva_bsc_id: number;
}

export class TableroControlPresenter {
  static toHttp({
    plan,
    perspectivas,
    kpis,
    iniciativas,
  }: TableroControlResultado) {
    return {
      plan: {
        id: plan.id,
        codigo: plan.codigo,
        nombre: plan.nombre,
        anio_inicio: plan.anio_inicio,
        anio_fin: plan.anio_fin,
        estado_plan: {
          codigo: plan.estado_plan.codigo,
          nombre: plan.estado_plan.nombre,
        },
      },
      perspectivas: [...perspectivas]
        .sort((a, b) => a.orden - b.orden)
        .map((perspectiva) => ({
          id: perspectiva.id,
          nombre: perspectiva.nombre,
          objetivos: this.objetivosDeLaPerspectiva(
            perspectiva.id,
            kpis,
            iniciativas,
            plan,
          ),
        })),
    };
  }

  private static objetivosDeLaPerspectiva(
    perspectivaId: number,
    kpis: KpiEntityEnriquecido[],
    iniciativas: IniciativaEntityEnriquecido[],
    plan: PlanEstrategicoEntityConEstado,
  ) {
    const objetivos = new Map<number, ObjetivoTablero>();

    for (const kpi of kpis) {
      const objetivo = kpi.objetivo_estrategico;

      if (objetivo.perspectiva_bsc.id === perspectivaId) {
        objetivos.set(objetivo.id, {
          id: objetivo.id,
          codigo: objetivo.codigo,
          nombre: objetivo.nombre,
          responsable: objetivo.responsable,
          perspectiva_bsc_id: objetivo.perspectiva_bsc.id,
        });
      }
    }

    for (const iniciativa of iniciativas) {
      const objetivo = iniciativa.objetivo_estrategico;

      if (objetivo.perspectiva_bsc.id === perspectivaId) {
        objetivos.set(objetivo.id, {
          id: objetivo.id,
          codigo: objetivo.codigo,
          nombre: objetivo.nombre,
          responsable: objetivo.responsable,
          perspectiva_bsc_id: objetivo.perspectiva_bsc.id,
        });
      }
    }

    return [...objetivos.values()]
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
      .map((objetivo) => ({
        id: objetivo.id,
        codigo: objetivo.codigo,
        nombre: objetivo.nombre,
        responsable: objetivo.responsable,
        iniciativas: iniciativas
          .filter(
            (iniciativa) => iniciativa.objetivo_estrategico.id === objetivo.id,
          )
          .map((iniciativa) => IniciativaPresenter.toHttp(iniciativa)),
        kpis: kpis
          .filter((kpi) => kpi.objetivo_estrategico.id === objetivo.id)
          .map((kpi) => this.kpiToHttp(kpi, plan)),
      }));
  }

  private static kpiToHttp(
    kpi: KpiEntityEnriquecido,
    plan: PlanEstrategicoEntityConEstado,
  ) {
    const valoresPorAnio = Array.from(
      { length: plan.anio_fin - plan.anio_inicio + 1 },
      (_, indice) => {
        const anio = plan.anio_inicio + indice;
        const meta = kpi.metas_anuales.find((item) => item.anio === anio);
        const valor = kpi.valores_anuales.find((item) => item.anio === anio);

        return {
          anio,
          meta: meta?.meta ?? null,
          periodo: valor
            ? {
                id: valor.periodo.id,
                codigo: valor.periodo.codigo,
                nombre: valor.periodo.nombre,
              }
            : null,
          valor: valor?.valor ?? null,
          semaforo_color: valor?.semaforo_color ?? null,
        };
      },
    );

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
      valores_por_anio: valoresPorAnio,
    };
  }
}
