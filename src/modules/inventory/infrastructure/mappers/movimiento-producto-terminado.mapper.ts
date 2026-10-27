import { MovimientoProductoTerminado as PrismaMovimientoProductoTerminado } from '@prisma/client';
import { MovimientoProductoTerminadoEntity } from '../../domain/entities';
import { TipoMovimientoProductoTerminado } from '../../domain/enums';
import { UnidadMedidaPresentacion } from '../../../catalog/domain/enums';

type PrismaMovimientoProductoTerminadoConLote =
  PrismaMovimientoProductoTerminado & {
    lote_producto_terminado: {
      codigo_lote: string;
      producto_terminado: {
        id: number;
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
  };

export class MovimientoProductoTerminadoMapper {
  static toDomain(
    movimiento: PrismaMovimientoProductoTerminadoConLote,
  ): MovimientoProductoTerminadoEntity {
    const { lote_producto_terminado: lote } = movimiento;
    const { producto_terminado: pt } = lote;
    const pp = pt.producto_presentacion;

    return new MovimientoProductoTerminadoEntity(
      movimiento.id,
      movimiento.codigo,
      movimiento.lote_producto_terminado_id,
      lote.codigo_lote,
      pt.id,
      pp.sku,
      pp.producto_id,
      pp.producto.nombre,
      pp.producto.categoria_id,
      pp.producto.categoria.nombre,
      pp.presentacion_id,
      pp.presentacion.cantidad,
      pp.presentacion.unidad_medida as UnidadMedidaPresentacion,
      movimiento.tipo as TipoMovimientoProductoTerminado,
      movimiento.cantidad.toNumber(),
      movimiento.stock_anterior.toNumber(),
      movimiento.stock_resultante.toNumber(),
      movimiento.razon,
      movimiento.fecha,
      movimiento.created_at,
    );
  }
}
