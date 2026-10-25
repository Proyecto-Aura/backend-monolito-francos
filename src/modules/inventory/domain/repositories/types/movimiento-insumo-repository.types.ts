import { TipoMovimientoInsumo } from '../../enums';
import { PaginationParams } from '../../../../catalog/domain/repositories/types/pagination.types';

// stock_anterior/stock_resultante no se piden: los completa el trigger de
// base de datos a partir del cantidad_actual real del lote en ese instante.
export interface CreateMovimientoInsumoParams {
  lote_insumo_id: number;
  tipo: TipoMovimientoInsumo;
  cantidad: number;
  razon: string;
}

export interface ListMovimientoInsumoParams extends PaginationParams {
  // Texto libre contra nombre o sku del insumo (vía lote_insumo.insumo).
  search?: string;
  insumo_id?: number;
  lote_insumo_id?: number;
  tipo?: TipoMovimientoInsumo;
  fecha_desde?: Date;
  fecha_hasta?: Date;
}
