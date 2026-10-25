import { MovimientoInsumo as PrismaMovimientoInsumo } from '@prisma/client';
import { MovimientoInsumoEntity } from '../../domain/entities';
import { TipoMovimientoInsumo, UnidadMedidaInsumo } from '../../domain/enums';

type PrismaMovimientoInsumoConLote = PrismaMovimientoInsumo & {
  lote_insumo: {
    codigo_lote: string;
    insumo: { id: number; nombre: string; sku: string; unidad_medida: string };
  };
};

export class MovimientoInsumoMapper {
  static toDomain(
    movimiento: PrismaMovimientoInsumoConLote,
  ): MovimientoInsumoEntity {
    return new MovimientoInsumoEntity(
      movimiento.id,
      movimiento.codigo,
      movimiento.lote_insumo_id,
      movimiento.lote_insumo.codigo_lote,
      movimiento.lote_insumo.insumo.id,
      movimiento.lote_insumo.insumo.nombre,
      movimiento.lote_insumo.insumo.sku,
      movimiento.lote_insumo.insumo.unidad_medida as UnidadMedidaInsumo,
      movimiento.tipo as TipoMovimientoInsumo,
      movimiento.cantidad.toNumber(),
      movimiento.stock_anterior.toNumber(),
      movimiento.stock_resultante.toNumber(),
      movimiento.razon,
      movimiento.fecha,
      movimiento.created_at,
    );
  }
}
