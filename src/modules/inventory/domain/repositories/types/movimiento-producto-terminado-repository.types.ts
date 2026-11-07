import { TipoMovimientoProductoTerminado } from '../../enums';
import { PaginationParams } from '../../../../catalog/domain/repositories/types/pagination.types';

// stock_anterior/stock_resultante no se piden: los completa el trigger de
// base de datos a partir del cantidad_actual real del lote en ese instante.
export interface CreateMovimientoProductoTerminadoParams {
  lote_producto_terminado_id: number;
  tipo: TipoMovimientoProductoTerminado;
  cantidad: number;
  razon: string;
  // Pedido de venta que originó esta salida (ver EntregarPedidoADespachoUseCase).
  pedido_id?: number;
}

export interface ListMovimientoProductoTerminadoParams extends PaginationParams {
  // Texto libre contra sku o nombre del producto (vía lote_producto_terminado.producto_terminado).
  search?: string;
  producto_terminado_id?: number;
  lote_producto_terminado_id?: number;
  tipo?: TipoMovimientoProductoTerminado;
  fecha_desde?: Date;
  fecha_hasta?: Date;
}
