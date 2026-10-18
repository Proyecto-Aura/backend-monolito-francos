import { SerieComprobanteEntity } from '../../domain/entities/serie-comprobante.entity';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class SerieComprobantePresenter {
  static toHttp(serie: SerieComprobanteEntity) {
    return {
      id: serie.id,
      tipo: serie.tipo,
      serie: serie.serie,
      correlativo_inicio: serie.correlativo_inicio,
      correlativo_fin: serie.correlativo_fin,
      // Último número emitido; null mientras la serie no haya emitido ninguno.
      correlativo_actual: serie.haEmitido ? serie.correlativo_actual : null,
      siguiente: serie.siguiente,
      restantes: serie.restantes,
      umbral_alerta: serie.umbral_alerta,
      por_agotar: serie.porAgotar,
      estado: serie.estado,
      created_at: serie.created_at,
      updated_at: serie.updated_at,
    };
  }

  static listToHttp(series: SerieComprobanteEntity[]) {
    return series.map((serie) => this.toHttp(serie));
  }

  static paginatedToHttp(result: PaginatedResult<SerieComprobanteEntity>) {
    return {
      data: this.listToHttp(result.data),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
