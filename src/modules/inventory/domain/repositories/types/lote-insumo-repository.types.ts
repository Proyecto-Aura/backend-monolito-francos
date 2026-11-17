import { EstadoLoteInsumo } from '../../enums';
import { PaginationParams } from '../../../../catalog/domain/repositories/types/pagination.types';

export interface CreateLoteInsumoParams {
  insumo_id: number;
  codigo_lote: string;
  fecha_ingreso: Date;
  fecha_vencimiento: Date | null;
  cantidad_inicial: number;
  // 'por_vencer' no es un valor real de la columna (se deriva al leer, ver
  // LoteInsumoMapper): nunca se puede crear un lote con ese estado.
  estado: Exclude<EstadoLoteInsumo, EstadoLoteInsumo.POR_VENCER>;
  activo: boolean;
  // Motivo del movimiento "entrada" que se crea junto con el lote. No se
  // pide cantidad_actual: nace en 0 y el propio movimiento "entrada" (vía
  // trigger) la deja en cantidad_inicial.
  razon: string;
}

export interface ListLoteInsumosParams extends PaginationParams {
  search?: string;
  insumo_id?: number;
  estado?: EstadoLoteInsumo;
  activo?: boolean;
  vence_desde?: Date;
  vence_hasta?: Date;
}
