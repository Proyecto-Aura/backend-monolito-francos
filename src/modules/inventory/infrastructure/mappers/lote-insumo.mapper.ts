import { LoteInsumo as PrismaLoteInsumo } from '@prisma/client';
import { LoteInsumoEntity } from '../../domain/entities';
import { EstadoLoteInsumo } from '../../domain/enums';

// Ventana de alerta temprana para "por_vencer": un lote activo entra acá
// cuando le quedan DIAS_POR_VENCER días o menos para su fecha_vencimiento
// (y todavía no venció). Mismo valor que usa el filtro `estado` del listado
// (PrismaLoteInsumoRepository) para que ambos lados calculen lo mismo.
export const DIAS_POR_VENCER = 15;

export class LoteInsumoMapper {
  // 'vencido' y 'por_vencer' no se persisten en la columna estado (no hay
  // cron ni trigger que los actualice solo con el paso del tiempo): se
  // derivan acá, al leer, comparando fecha_vencimiento contra hoy. 'agotado'
  // tiene prioridad sobre ambos porque ya refleja algo más específico
  // (cantidad_actual en 0) y sí lo mantiene al día el trigger de stock.
  private static calcularEstado(lote: PrismaLoteInsumo): EstadoLoteInsumo {
    if (lote.estado !== 'activo' || lote.fecha_vencimiento === null) {
      return lote.estado as EstadoLoteInsumo;
    }

    const hoy = new Date();
    if (lote.fecha_vencimiento < hoy) {
      return EstadoLoteInsumo.VENCIDO;
    }

    const limitePorVencer = new Date(hoy);
    limitePorVencer.setDate(limitePorVencer.getDate() + DIAS_POR_VENCER);
    if (lote.fecha_vencimiento <= limitePorVencer) {
      return EstadoLoteInsumo.POR_VENCER;
    }

    return EstadoLoteInsumo.ACTIVO;
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
