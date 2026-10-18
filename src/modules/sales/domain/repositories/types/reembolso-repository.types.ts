import { ReembolsoEntity } from '../../entities';
import {
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
