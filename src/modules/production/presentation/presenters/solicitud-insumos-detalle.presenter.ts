import { SolicitudInsumosDetalleEntity } from '../../domain/entities';

export class SolicitudInsumosDetallePresenter {
  static toHttp(detalle: SolicitudInsumosDetalleEntity) {
    return {
      id: detalle.id,
      solicitud_insumos_id: detalle.solicitud_insumos_id,
      insumo_id: detalle.insumo_id,
      insumo_sku: detalle.insumo_sku,
      insumo_nombre: detalle.insumo_nombre,
      insumo_unidad_medida: detalle.insumo_unidad_medida,
      stock_disponible: detalle.insumo_stock_actual,
      cantidad_solicitada: detalle.cantidad_solicitada,
      created_at: detalle.created_at,
    };
  }

  static listToHttp(detalles: SolicitudInsumosDetalleEntity[]) {
    return detalles.map((detalle) => this.toHttp(detalle));
  }
}
