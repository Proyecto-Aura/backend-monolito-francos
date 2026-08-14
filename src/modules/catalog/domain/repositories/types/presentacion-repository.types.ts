import { UnidadMedidaPresentacion } from '../../enums';
import { PaginationParams } from './pagination.types';

export interface CreatePresentacionParams {
  cantidad: number;
  unidad_medida: UnidadMedidaPresentacion;
  descripcion?: string | null;
  estado: boolean;
}

export interface UpdatePresentacionParams {
  cantidad?: number;
  unidad_medida?: UnidadMedidaPresentacion;
  descripcion?: string | null;
}

export interface ListPresentacionesParams extends PaginationParams {
  search?: string;

  // filtros
  estado?: boolean;
  unidad_medida?: UnidadMedidaPresentacion;
  cantidad?: number;
}
