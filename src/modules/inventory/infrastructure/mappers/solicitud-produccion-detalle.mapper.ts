import { SolicitudProduccionDetalle as PrismaSolicitudProduccionDetalle } from '@prisma/client';
import { SolicitudProduccionDetalleEntity } from '../../domain/entities';
import { UnidadMedidaPresentacion } from '../../../catalog/domain/enums';

type PrismaSolicitudProduccionDetalleConCatalogo =
  PrismaSolicitudProduccionDetalle & {
    producto_terminado: {
      producto_presentacion: {
        sku: string;
        producto_id: number;
        presentacion_id: number;
        producto: {
          nombre: string;
          categoria_id: number;
          categoria: { nombre: string };
        };
        presentacion: { cantidad: number; unidad_medida: string };
      };
    };
  };

export class SolicitudProduccionDetalleMapper {
  static toDomain(
    detalle: PrismaSolicitudProduccionDetalleConCatalogo,
  ): SolicitudProduccionDetalleEntity {
    const pp = detalle.producto_terminado.producto_presentacion;

    return new SolicitudProduccionDetalleEntity(
      detalle.id,
      detalle.solicitud_produccion_id,
      detalle.producto_terminado_id,
      pp.sku,
      pp.producto_id,
      pp.producto.nombre,
      pp.producto.categoria_id,
      pp.producto.categoria.nombre,
      pp.presentacion_id,
      pp.presentacion.cantidad,
      pp.presentacion.unidad_medida as UnidadMedidaPresentacion,
      detalle.cantidad_solicitada,
      detalle.created_at,
      detalle.updated_at,
    );
  }
}
