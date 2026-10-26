import { LoteProductoTerminadoEntity } from '../../domain/entities';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';

export class LoteProductoTerminadoPresenter {
  static toHttp(lote: LoteProductoTerminadoEntity) {
    return {
      id: lote.id,
      producto_terminado_id: lote.producto_terminado_id,
      sku: lote.sku,
      producto_id: lote.producto_id,
      producto_nombre: lote.producto_nombre,
      categoria_id: lote.categoria_id,
      categoria_nombre: lote.categoria_nombre,
      presentacion_id: lote.presentacion_id,
      presentacion_cantidad: lote.presentacion_cantidad,
      presentacion_unidad_medida: lote.presentacion_unidad_medida,
      codigo_lote: lote.codigo_lote,
      fecha_produccion: lote.fecha_produccion,
      fecha_vencimiento: lote.fecha_vencimiento,
      cantidad_inicial: lote.cantidad_inicial,
      cantidad_actual: lote.cantidad_actual,
      estado: lote.estado,
      activo: lote.activo,
      created_at: lote.created_at,
      updated_at: lote.updated_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<LoteProductoTerminadoEntity>) {
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
