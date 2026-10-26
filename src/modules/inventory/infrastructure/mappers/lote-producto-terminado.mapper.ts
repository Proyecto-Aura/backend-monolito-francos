import { LoteProductoTerminado as PrismaLoteProductoTerminado } from '@prisma/client';
import { LoteProductoTerminadoEntity } from '../../domain/entities';
import { EstadoLoteProductoTerminado } from '../../domain/enums';
import { UnidadMedidaPresentacion } from '../../../catalog/domain/enums';
import { DIAS_POR_VENCER } from './lote-insumo.mapper';

type PrismaLoteProductoTerminadoConCatalogo = PrismaLoteProductoTerminado & {
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

export class LoteProductoTerminadoMapper {
  // Mismo criterio y umbral (DIAS_POR_VENCER, ver lote-insumo.mapper) que
  // lotes de insumo: 'vencido' y 'por_vencer' no se persisten en la columna
  // estado, se derivan acá al leer.
  private static calcularEstado(
    lote: PrismaLoteProductoTerminado,
  ): EstadoLoteProductoTerminado {
    if (lote.estado !== 'activo' || lote.fecha_vencimiento === null) {
      return lote.estado as EstadoLoteProductoTerminado;
    }

    const hoy = new Date();
    if (lote.fecha_vencimiento < hoy) {
      return EstadoLoteProductoTerminado.VENCIDO;
    }

    const limitePorVencer = new Date(hoy);
    limitePorVencer.setDate(limitePorVencer.getDate() + DIAS_POR_VENCER);
    if (lote.fecha_vencimiento <= limitePorVencer) {
      return EstadoLoteProductoTerminado.POR_VENCER;
    }

    return EstadoLoteProductoTerminado.ACTIVO;
  }

  static toDomain(
    lote: PrismaLoteProductoTerminadoConCatalogo,
  ): LoteProductoTerminadoEntity {
    const pp = lote.producto_terminado.producto_presentacion;

    return new LoteProductoTerminadoEntity(
      lote.id,
      lote.producto_terminado_id,
      pp.sku,
      pp.producto_id,
      pp.producto.nombre,
      pp.producto.categoria_id,
      pp.producto.categoria.nombre,
      pp.presentacion_id,
      pp.presentacion.cantidad,
      pp.presentacion.unidad_medida as UnidadMedidaPresentacion,
      lote.codigo_lote,
      lote.fecha_produccion,
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
