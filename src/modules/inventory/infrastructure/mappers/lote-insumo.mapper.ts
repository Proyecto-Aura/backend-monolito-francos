import { LoteInsumo as PrismaLoteInsumo } from '@prisma/client';
import { LoteInsumoEntity } from '../../domain/entities';
import { EstadoLoteInsumo } from '../../domain/enums';

export class LoteInsumoMapper {
  // 'vencido' no se persiste en la columna estado (no hay cron ni trigger
  // que lo actualice solo con el paso del tiempo): se deriva acá, al leer,
  // comparando fecha_vencimiento contra hoy. 'agotado' tiene prioridad sobre
  // 'vencido' porque ya refleja algo más específico (cantidad_actual en 0) y
  // sí lo mantiene al día el trigger de stock.
  private static calcularEstado(lote: PrismaLoteInsumo): EstadoLoteInsumo {
    const vencido =
      lote.fecha_vencimiento !== null && lote.fecha_vencimiento < new Date();

    if (lote.estado === 'activo' && vencido) {
      return EstadoLoteInsumo.VENCIDO;
    }

    return lote.estado as EstadoLoteInsumo;
  }

  static toDomain(lote: PrismaLoteInsumo): LoteInsumoEntity {
    return new LoteInsumoEntity(
      lote.id,
      lote.insumo_id,
      lote.codigo_lote,
      lote.fecha_ingreso,
      lote.fecha_vencimiento,
      lote.cantidad_inicial.toNumber(),
      lote.cantidad_actual.toNumber(),
      this.calcularEstado(lote),
      lote.activo,
      lote.created_at,
      lote.updated_at,
    );
  }
}
