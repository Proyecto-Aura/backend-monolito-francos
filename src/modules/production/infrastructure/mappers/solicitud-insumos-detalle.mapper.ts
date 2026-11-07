import { SolicitudInsumosDetalle as PrismaSolicitudInsumosDetalle } from '@prisma/client';
import { SolicitudInsumosDetalleEntity } from '../../domain/entities';
import { UnidadMedidaInsumo } from '../../../inventory/domain/enums';

type PrismaSolicitudInsumosDetalleConInsumo = PrismaSolicitudInsumosDetalle & {
  insumo: {
    sku: string;
    nombre: string;
    unidad_medida: string;
    stock_actual: { toNumber(): number };
  };
};

export class SolicitudInsumosDetalleMapper {
  static toDomain(
    detalle: PrismaSolicitudInsumosDetalleConInsumo,
  ): SolicitudInsumosDetalleEntity {
    return new SolicitudInsumosDetalleEntity(
      detalle.id,
      detalle.solicitud_insumos_id,
      detalle.insumo_id,
      detalle.insumo.sku,
      detalle.insumo.nombre,
      detalle.insumo.unidad_medida as UnidadMedidaInsumo,
      detalle.insumo.stock_actual.toNumber(),
      detalle.cantidad_solicitada.toNumber(),
      detalle.created_at,
    );
  }
}
