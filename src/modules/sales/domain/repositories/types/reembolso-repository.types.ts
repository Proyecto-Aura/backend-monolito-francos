import { ReembolsoEntity } from '../../entities';
import {
  EstadoPedido,
  EstadoReembolso,
  MetodoPago,
  TipoNotificacionReembolso,
} from '../../enums';
import { PaginationParams } from './pagination.types';

export interface ListReembolsosParams extends PaginationParams {
  estado?: EstadoReembolso;
  // Rango sobre fecha_solicitud: desde inclusive, hasta exclusivo.
  desde?: Date;
  hasta?: Date;
  // Busca en el código de la solicitud, el del pedido y el nombre del cliente.
  q?: string;
}

// Solicitud con los datos de su pedido que muestran el listado (RF-A039) y el
// detalle (RF-A041).
export interface ReembolsoConPedido {
  reembolso: ReembolsoEntity;
  pedido_id: number;
  pedido_codigo: string;
  cliente_nombre: string;
  metodo_pago: MetodoPago;
}

export interface ReembolsoDetalle extends ReembolsoConPedido {
  // Enlace temporal para descargar la evidencia; null si no hay evidencia.
  evidencia_url: string | null;
}

export interface CambioEstadoReembolso {
  estado: EstadoReembolso;
  motivo_rechazo?: string;
  resuelto_por?: string;
  fecha_resolucion?: Date;
}

export interface NotificacionCliente {
  tipo: TipoNotificacionReembolso;
  titulo: string;
  mensaje: string;
}

// Lo que la solicitud del cliente necesita saber de su pedido (HU-B-014).
export interface PedidoParaReembolso {
  id: number;
  codigo: string;
  cliente_id: string;
  estado: EstadoPedido;
  // null si el pedido no tiene pago registrado.
  pago: { id: number; monto: number } | null;
  // Si el pago ya tiene una solicitud (una sola por pedido, RF-B40).
  tiene_reembolso: boolean;
}

// id y código reservados antes de subir la evidencia (la key lleva el código).
export interface CodigoReembolsoReservado {
  id: number;
  codigo: string;
}

export interface CrearSolicitudReembolsoParams extends CodigoReembolsoReservado {
  pago_id: number;
  monto: number;
  motivo_cliente: string;
  evidencia_key: string;
}

export interface ListReembolsosDeClienteParams extends PaginationParams {
  estado?: EstadoReembolso;
}
