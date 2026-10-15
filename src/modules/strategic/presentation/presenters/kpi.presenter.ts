import { SemaforoConfigEntity } from '../../domain/entities';
import { KpiEntityEnriquecido } from '../../domain/repositories/types/kpi-repository.types';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class KpiPresenter {
  static toHttp(kpi: KpiEntityEnriquecido) {
    const metasPorAnio = [...kpi.metas_anuales]
      .sort((a, b) => a.anio - b.anio)
      .map((meta) => {
        const semaforosDelAnio = kpi.semaforos.filter(
          (semaforo) => semaforo.anio === meta.anio,
        );

        return {
          anio: meta.anio,
          meta: meta.meta,
          semaforo: {
            verde: this.semaforoToHttp(
              semaforosDelAnio.find((item) => item.color === 'VERDE'),
            ),
            amarillo: this.semaforoToHttp(
              semaforosDelAnio.find((item) => item.color === 'AMARILLO'),
            ),
            rojo: this.semaforoToHttp(
              semaforosDelAnio.find((item) => item.color === 'ROJO'),
            ),
          },
        };
      });

    return {
      id: kpi.id,
      codigo: kpi.codigo,
      nombre: kpi.nombre,
      formula: kpi.formula,
      estado: kpi.estado,
      objetivo: {
        id: kpi.objetivo_estrategico.id,
        nombre: kpi.objetivo_estrategico.nombre,
        perspectiva: {
          id: kpi.objetivo_estrategico.perspectiva_bsc.id,
          nombre: kpi.objetivo_estrategico.perspectiva_bsc.nombre,
        },
      },
      frecuencia: {
        id: kpi.frecuencia.id,
        nombre: kpi.frecuencia.nombre,
      },
      unidad_medida: {
        id: kpi.unidad_medida.id,
        nombre: kpi.unidad_medida.nombre,
        simbolo: kpi.unidad_medida.simbolo,
      },
      meta_final:
        metasPorAnio.length > 0
          ? metasPorAnio[metasPorAnio.length - 1].meta
          : null,
      metas_por_anio: metasPorAnio,
    };
  }

  static paginatedToHttp(result: PaginatedResult<KpiEntityEnriquecido>) {
    return {
      data: result.data.map((kpi) => this.toHttp(kpi)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  private static semaforoToHttp(semaforo?: SemaforoConfigEntity) {
    if (!semaforo) {
      return null;
    }

    return {
      operador: semaforo.operador,
      valor_referencia: semaforo.valor_referencia,
      color_hex: semaforo.color_hex,
    };
  }
}
