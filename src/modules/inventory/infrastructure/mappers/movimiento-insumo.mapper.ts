import { MovimientoInsumo as PrismaMovimientoInsumo } from '@prisma/client';
import { MovimientoInsumoEntity } from '../../domain/entities';
import { TipoMovimientoInsumo } from '../../domain/enums';

type PrismaMovimientoInsumoConLote = PrismaMovimientoInsumo & {
  lote_insumo: { codigo_lote: string };
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
