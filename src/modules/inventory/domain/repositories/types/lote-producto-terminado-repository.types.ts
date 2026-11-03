import { EstadoLoteProductoTerminado } from '../../enums';
import { PaginationParams } from '../../../../catalog/domain/repositories/types/pagination.types';

export interface CreateLoteProductoTerminadoParams {
  producto_terminado_id: number;
  codigo_lote: string;
  fecha_produccion: Date;
  fecha_vencimiento: Date | null;
  cantidad_inicial: number;
  // 'por_vencer' no es un valor real de la columna (se deriva al leer, ver
  // LoteProductoTerminadoMapper): nunca se puede crear un lote con ese estado.
  estado: Exclude<
    EstadoLoteProductoTerminado,
    EstadoLoteProductoTerminado.POR_VENCER
  >;
  activo: boolean;
  // Motivo del movimiento "entrada" que se crea junto con el lote. No se
  // pide cantidad_actual: nace en 0 y el propio movimiento "entrada" (vía
  // trigger) la deja en cantidad_inicial.
  razon: string;
}

export interface ListLoteProductoTerminadoParams extends PaginationParams {
  // Busca por sku o nombre del producto (vía producto_terminado.producto_presentacion).
  search?: string;
  producto_terminado_id?: number;
  estado?: EstadoLoteProductoTerminado;
  activo?: boolean;
  vence_desde?: Date;
  vence_hasta?: Date;
}
