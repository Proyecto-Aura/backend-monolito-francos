import { TipoPromocion } from '../../enums';
import { PaginationParams } from './pagination.types';

export interface CreatePromocionParams {
  producto_presentacion_id: number;
  nombre: string;
  valor: number;
  cantidad_paga: number | null;
  cantidad_lleva: number | null;
  cantidad_minima: number | null;
  producto_presentacion_regalo_id: number | null;
  tipo: TipoPromocion;
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: boolean;
}

export interface UpdatePromocionParams {
  producto_presentacion_id?: number;
  nombre?: string;
  valor?: number;
  cantidad_paga?: number | null;
  cantidad_lleva?: number | null;
  cantidad_minima?: number | null;
  producto_presentacion_regalo_id?: number | null;
  tipo?: TipoPromocion;
  fecha_inicio?: Date;
  fecha_fin?: Date;
}

export interface ListPromocionesParams extends PaginationParams {
  search?: string;

  producto_presentacion_id?: number;
  estado?: boolean;
}
