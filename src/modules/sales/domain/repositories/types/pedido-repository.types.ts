import { DetallePedidoEntity, PagoEntity, PedidoEntity } from '../../entities';
import {
  EstadoPedido,
  MetodoPago,
  OrigenPedido,
  TipoEntrega,
} from '../../enums';
import { PaginationParams } from './pagination.types';

// Lo que un pedido necesita saber del cliente: si está activo y a qué correo
// enviar el cobro de Culqi.
export interface ClienteParaPedido {
  id: string;
  estado: boolean;
  email: string | null;
}

// Precios vigentes de una presentación al momento de registrar el pedido.
export interface PresentacionParaPedido {
  id: number;
  estado: boolean;
  producto_estado: boolean;
  precio_unitario: number;
  precio_mayorista: number | null;
  umbral_mayorista: number | null;
}

export interface CreateDetallePedidoParams {
  producto_presentacion_id: number;
  cantidad: number;
  precio_unitario: number;
  precio_aplicado: number;
  subtotal: number;
}

export interface CreatePagoParams {
  metodo_pago: MetodoPago;
  monto: number;
  numero_operacion: string | null;
  fecha_pago: Date;
}

export interface CreatePedidoParams {
  cliente_id: string;
  user_id: string | null;
  origen: OrigenPedido;
  tipo_entrega: TipoEntrega;
  direccion_entrega: string | null;
  total: number;
  detalles: CreateDetallePedidoParams[];
  pago: CreatePagoParams;
}

export interface ListPedidosParams extends PaginationParams {
  estado?: EstadoPedido;
  origen?: OrigenPedido;
  // Rango sobre created_at: desde inclusive, hasta exclusivo.
  desde?: Date;
  hasta?: Date;
}

// Fila del listado (RF-A030).
export interface PedidoResumen {
  pedido: PedidoEntity;
  cliente_nombre: string;
  metodo_pago: MetodoPago | null;
}

export interface DetallePedidoConProducto {
  detalle: DetallePedidoEntity;
  sku: string;
  producto_nombre: string;
  presentacion: string;
}

// Detalle completo de un pedido (RF-A031).
export interface PedidoDetalle {
  pedido: PedidoEntity;
  cliente_nombre: string;
  detalles: DetallePedidoConProducto[];
  pago: PagoEntity | null;
}
