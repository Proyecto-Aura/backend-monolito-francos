import { LoteInsumo as PrismaLoteInsumo } from '@prisma/client';
import { LoteInsumoEntity } from '../../domain/entities';
import { EstadoLoteInsumo } from '../../domain/enums';

export class LoteInsumoMapper {
  static toDomain(lote: PrismaLoteInsumo): LoteInsumoEntity {
    return new LoteInsumoEntity(
      lote.id,
      lote.insumo_id,
      lote.codigo_lote,
      lote.fecha_ingreso,
      lote.fecha_vencimiento,
      lote.cantidad_inicial.toNumber(),
      lote.cantidad_actual.toNumber(),
      lote.estado as EstadoLoteInsumo,
      lote.activo,
      lote.created_at,
      lote.updated_at,
    );
  }
}
