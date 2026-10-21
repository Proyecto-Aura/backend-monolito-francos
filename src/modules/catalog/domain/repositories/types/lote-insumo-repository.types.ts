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
}

export interface ListLoteInsumosParams extends PaginationParams {
  search?: string;
  insumo_id?: number;
  estado?: EstadoLoteInsumo;
  activo?: boolean;
}
