import { LoteInsumoEntity } from '../../domain/entities';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class LoteInsumoPresenter {
  static toHttp(lote: LoteInsumoEntity) {
    return {
      id: lote.id,
      insumo_id: lote.insumo_id,
      codigo_lote: lote.codigo_lote,
      fecha_ingreso: lote.fecha_ingreso,
      fecha_vencimiento: lote.fecha_vencimiento,
      cantidad_inicial: lote.cantidad_inicial,
      cantidad_actual: lote.cantidad_actual,
      estado: lote.estado,
      activo: lote.activo,
      created_at: lote.created_at,
      updated_at: lote.updated_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<LoteInsumoEntity>) {
    return {
      data: result.data.map((lote) => this.toHttp(lote)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
