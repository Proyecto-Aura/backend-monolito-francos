import { MovimientoProductoTerminadoEntity } from '../../domain/entities';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';

export class MovimientoProductoTerminadoPresenter {
  static toHttp(movimiento: MovimientoProductoTerminadoEntity) {
    return {
      id: movimiento.id,
      codigo: movimiento.codigo,
      lote_producto_terminado_id: movimiento.lote_producto_terminado_id,
      codigo_lote: movimiento.codigo_lote,
      producto_terminado_id: movimiento.producto_terminado_id,
      sku: movimiento.sku,
      producto_id: movimiento.producto_id,
      producto_nombre: movimiento.producto_nombre,
      categoria_id: movimiento.categoria_id,
      categoria_nombre: movimiento.categoria_nombre,
      presentacion_id: movimiento.presentacion_id,
      presentacion_cantidad: movimiento.presentacion_cantidad,
      presentacion_unidad_medida: movimiento.presentacion_unidad_medida,
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
  static listToHttp(movimientos: MovimientoProductoTerminadoEntity[]) {
    return movimientos.map((movimiento) => this.toHttp(movimiento));
  }

  static paginatedToHttp(
    result: PaginatedResult<MovimientoProductoTerminadoEntity>,
  ) {
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
