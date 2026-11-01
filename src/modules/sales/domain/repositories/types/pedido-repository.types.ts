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

// Lo que el resumen del carrito necesita del cliente que inició sesión: si está
// activo, su dirección predeterminada del perfil (RF-B20) y, si se identificó
// con RUC, sus datos para proponer una factura (HU-B-009).
export interface ClienteParaResumen {
  id: string;
  estado: boolean;
  direccion: string | null;
  // Número de documento solo cuando el tipo de documento es RUC.
  ruc?: string | null;
  razon_social?: string | null;
}

// Precios vigentes de una presentación al momento de registrar el pedido.
export interface PresentacionParaPedido {
  id: number;
  estado: boolean;
  producto_estado: boolean;
  precio_unitario: number;
  precio_mayorista: number | null;
  umbral_mayorista: number | null;
  // Si el cliente la ve en el catálogo del portal (RF-A025).
  visible_portal_b: boolean;
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
  // Limita el listado a estos estados (despacho, inventario); `estado` afina dentro.
  estados?: readonly EstadoPedido[];
  origen?: OrigenPedido;
  cliente_id?: string;
  // Busca por código de pedido o nombre/razón social del cliente.
  search?: string;
  // Rango sobre created_at: desde inclusive, hasta exclusivo.
  desde?: Date;
  hasta?: Date;
}

// Conteo de "pedidos por preparar" para las cards de la vista de inventario.
export interface IndicadoresPedidosInventario {
  en_espera_inventario: number;
  en_preparacion: number;
  pendiente_entrega: number;
}

// Aviso in-app al cliente cuando su pedido sale a reparto (RF-A097).
export interface NotificacionPedidoParams {
  titulo: string;
  mensaje: string;
}

// Fila del listado (RF-A030).
export interface PedidoResumen {
  pedido: PedidoEntity;
  cliente_nombre: string;
  metodo_pago: MetodoPago | null;
  // Cantidad de líneas distintas y suma de unidades pedidas (vista de inventario).
  cantidad_productos: number;
  cantidad_unidades: number;
}

export interface DetallePedidoConProducto {
  detalle: DetallePedidoEntity;
  sku: string;
  producto_nombre: string;
  presentacion: string;
  // Stock actual de productos terminados de esa presentación (vista de inventario).
  stock_disponible: number;
  // Id de ProductoTerminado de esa presentación; null si la presentación no
  // tiene registro de producto terminado (no debería darse en un pedido ya creado).
  producto_terminado_id: number | null;
}

// Detalle completo de un pedido (RF-A031).
export interface PedidoDetalle {
  pedido: PedidoEntity;
  cliente_nombre: string;
  detalles: DetallePedidoConProducto[];
  pago: PagoEntity | null;
}
