import { EstadoSolicitudInsumos } from '../../enums';
import { PaginationParams } from '../../../../catalog/domain/repositories/types/pagination.types';

export interface CreateSolicitudInsumosParams {
  codigo_solicitud: string;
  solicitud_produccion_id: number | null;
  fecha_creacion: Date;
  fecha_limite: Date | null;
  solicitado_por: string;
  detalle: CreateSolicitudInsumosDetalleParams[];
}

export interface CreateSolicitudInsumosDetalleParams {
  insumo_id: number;
  cantidad_solicitada: number;
}

export interface ListSolicitudInsumosParams extends PaginationParams {
  // Texto libre contra el codigo de la solicitud o el nombre/sku del insumo.
  search?: string;
  estado?: EstadoSolicitudInsumos;
  solicitado_por?: string;
  solicitud_produccion_id?: number;
  fecha_desde?: Date;
  fecha_hasta?: Date;
}

export interface IndicadoresSolicitudInsumos {
  pendiente: number;
  en_proceso: number;
  entregado: number;
  rechazado: number;
  total: number;
}
