import { MovimientoInsumoEntity } from '../../domain/entities';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';

export class MovimientoInsumoPresenter {
  static toHttp(movimiento: MovimientoInsumoEntity) {
    return {
      id: movimiento.id,
      lote_insumo_id: movimiento.lote_insumo_id,
      tipo: movimiento.tipo,
      cantidad: movimiento.cantidad,
      stock_anterior: movimiento.stock_anterior,
      stock_resultante: movimiento.stock_resultante,
      razon: movimiento.razon,
      fecha: movimiento.fecha,
      created_at: movimiento.created_at,
    };
  }

  // Para la salida FEFO, que puede repartirse entre varios lotes y devolver
  // más de un movimiento sin paginar.
  static listToHttp(movimientos: MovimientoInsumoEntity[]) {
    return movimientos.map((movimiento) => this.toHttp(movimiento));
  }

  static paginatedToHttp(result: PaginatedResult<MovimientoInsumoEntity>) {
    return {
      data: result.data.map((movimiento) => this.toHttp(movimiento)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
