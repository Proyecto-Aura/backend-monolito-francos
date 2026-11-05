import { EstadoSolicitudProduccion } from '../../enums';
import { PaginationParams } from '../../../../catalog/domain/repositories/types/pagination.types';

export interface CreateSolicitudProduccionParams {
  codigo: string;
  fecha_creacion: Date;
  fecha_limite: Date | null;
  solicitado_por: string;
  detalle: CreateSolicitudProduccionDetalleParams[];
}

export interface CreateSolicitudProduccionDetalleParams {
  producto_terminado_id: number;
  cantidad_solicitada: number;
}

export interface ListSolicitudProduccionParams extends PaginationParams {
  // Texto libre contra el codigo de la solicitud o el nombre/sku del producto.
  search?: string;
  estado?: EstadoSolicitudProduccion;
  solicitado_por?: string;
  fecha_desde?: Date;
  fecha_hasta?: Date;
}

export interface IndicadoresSolicitudProduccion {
  pendiente: number;
  en_proceso: number;
  entregado: number;
  rechazado: number;
  total: number;
}
