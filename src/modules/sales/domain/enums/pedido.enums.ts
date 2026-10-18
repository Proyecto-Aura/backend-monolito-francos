export enum OrigenPedido {
  PORTAL = 'portal',
  MANUAL = 'manual',
}

// Estados del portal interno (RN6).
export enum EstadoPedido {
  CONFIRMADO = 'confirmado',
  EN_ESPERA_INVENTARIO = 'en_espera_inventario',
  EN_PREPARACION = 'en_preparacion',
  PENDIENTE_ENTREGA = 'pendiente_entrega',
  EN_CAMINO = 'en_camino',
  ENTREGADO = 'entregado',
  CANCELADO = 'cancelado',
}

export enum TipoEntrega {
  RECOJO_TIENDA = 'recojo_tienda',
  DELIVERY = 'delivery',
}

export enum MetodoPago {
  EFECTIVO = 'efectivo',
  CULQI = 'culqi',
}
