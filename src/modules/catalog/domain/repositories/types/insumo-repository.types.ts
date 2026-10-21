import { TipoInsumo, UnidadMedidaInsumo } from '../../enums';
import { PaginationParams } from './pagination.types';

export interface CreateInsumoParams {
  nombre: string;
  descripcion: string | null;
  unidad_medida: UnidadMedidaInsumo;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  tipo: TipoInsumo;
  estado: boolean;
}

export interface UpdateInsumoParams {
  nombre?: string;
  descripcion?: string | null;
  unidad_medida?: UnidadMedidaInsumo;
  stock_minimo?: number;
  stock_maximo?: number;
  tipo?: TipoInsumo;
}

export interface ListInsumosParams extends PaginationParams {
  search?: string;
  estado?: boolean;
  tipo?: TipoInsumo;
}

// Conteo de insumos activos por nivel de stock, para los KPI del dashboard.
// agotado: stock_actual <= 0
// bajo: stock_actual > 0 y < stock_minimo (umbral absoluto, el punto de reorden)
// alto: stock_actual >= stock_minimo y a más del 90% de stock_maximo (umbral %, cercanía al tope)
// normal: todo lo demás
export interface IndicadoresInsumo {
  agotado: number;
  bajo: number;
  normal: number;
  alto: number;
  total: number;
}
