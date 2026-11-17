import { EstadoSolicitudInsumos } from '../../enums';
import { PaginationParams } from '../../../../catalog/domain/repositories/types/pagination.types';
import { SolicitudInsumosEntity } from '../../entities';

// Vista de inventario ("solicitudes de insumos por entregar"): completo si
// TODAS las líneas alcanzan, sin_stock si NINGUNA alcanza, parcial en
// cualquier otro caso. Mismo criterio que DisponibilidadPedido.
export type DisponibilidadSolicitudInsumos =
  'completo' | 'parcial' | 'sin_stock';

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
  // Agrega `disponibilidad` a cada fila del listado (ver SolicitudInsumosResumen).
  conDisponibilidad?: boolean;
}

// Fila del listado. `disponibilidad` solo viene si se pidió con
// conDisponibilidad (vista de inventario), mismo criterio que PedidoResumen.
export interface SolicitudInsumosResumen {
  solicitud: SolicitudInsumosEntity;
  disponibilidad?: DisponibilidadSolicitudInsumos;
}

export interface IndicadoresSolicitudInsumos {
  pendiente: number;
  en_proceso: number;
  entregado: number;
  rechazado: number;
  total: number;
}
