import { SolicitudProduccionDetalleEntity } from '../../domain/entities';

export class SolicitudProduccionDetallePresenter {
  static toHttp(detalle: SolicitudProduccionDetalleEntity) {
    return {
      id: detalle.id,
      solicitud_produccion_id: detalle.solicitud_produccion_id,
      producto_terminado_id: detalle.producto_terminado_id,
      sku: detalle.sku,
      producto_id: detalle.producto_id,
      producto_nombre: detalle.producto_nombre,
      categoria_id: detalle.categoria_id,
      categoria_nombre: detalle.categoria_nombre,
      presentacion_id: detalle.presentacion_id,
      presentacion_cantidad: detalle.presentacion_cantidad,
      presentacion_unidad_medida: detalle.presentacion_unidad_medida,
      cantidad_solicitada: detalle.cantidad_solicitada,
      created_at: detalle.created_at,
      updated_at: detalle.updated_at,
    };
  }

  static listToHttp(detalles: SolicitudProduccionDetalleEntity[]) {
    return detalles.map((detalle) => this.toHttp(detalle));
  }
}
