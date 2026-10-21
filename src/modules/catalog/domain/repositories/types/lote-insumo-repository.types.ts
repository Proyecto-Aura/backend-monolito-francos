import { EstadoLoteInsumo } from '../../enums';
import { PaginationParams } from './pagination.types';

export interface CreateLoteInsumoParams {
  insumo_id: number;
  codigo_lote: string;
  fecha_ingreso: Date;
  fecha_vencimiento: Date | null;
  cantidad_inicial: number;
  estado: EstadoLoteInsumo;
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
}
