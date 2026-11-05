import { SolicitudProduccionDetalleEntity } from '../../domain/entities';
import { SolicitudProduccionDetalleConLote } from '../../application/use-cases/solicitud-produccion/get-solicitud-produccion-by-id.use-case';

export class SolicitudProduccionDetallePresenter {
  // lote_creado solo viene del detalle de la solicitud (conLoteToHttp); al
  // agregar/actualizar una línea no aplica (recién se puede editar mientras
  // está pendiente, antes de que exista ningún lote).
  static toHttp(
    detalle: SolicitudProduccionDetalleEntity,
    lote_creado?: boolean,
  ) {
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
      ...(lote_creado === undefined ? {} : { lote_creado }),
    };
  }

  static listToHttp(detalles: SolicitudProduccionDetalleEntity[]) {
    return detalles.map((detalle) => this.toHttp(detalle));
  }

  static listConLoteToHttp(detalles: SolicitudProduccionDetalleConLote[]) {
    return detalles.map(({ detalle, lote_creado }) =>
      this.toHttp(detalle, lote_creado),
    );
  }
}
