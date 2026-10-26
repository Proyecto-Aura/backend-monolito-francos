import { EstadoLoteProductoTerminado } from '../../enums';
import { PaginationParams } from '../../../../catalog/domain/repositories/types/pagination.types';

export interface ListLoteProductoTerminadoParams extends PaginationParams {
  // Busca por sku o nombre del producto (vía producto_terminado.producto_presentacion).
  search?: string;
  producto_terminado_id?: number;
  estado?: EstadoLoteProductoTerminado;
  activo?: boolean;
  vence_desde?: Date;
  vence_hasta?: Date;
}
