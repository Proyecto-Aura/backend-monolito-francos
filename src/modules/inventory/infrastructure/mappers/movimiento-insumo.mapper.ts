import { MovimientoInsumo as PrismaMovimientoInsumo } from '@prisma/client';
import { MovimientoInsumoEntity } from '../../domain/entities';
import { TipoMovimientoInsumo } from '../../domain/enums';

export class MovimientoInsumoMapper {
  static toDomain(movimiento: PrismaMovimientoInsumo): MovimientoInsumoEntity {
    return new MovimientoInsumoEntity(
      movimiento.id,
      movimiento.codigo,
      movimiento.lote_insumo_id,
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
