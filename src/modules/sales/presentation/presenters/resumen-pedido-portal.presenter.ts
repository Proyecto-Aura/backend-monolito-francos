import { ResumenPedidoPortal } from '../../application/use-cases/pedido/resumir-pedido-portal.use-case';

export class ResumenPedidoPortalPresenter {
  // Resumen del carrito antes del pago (HU-B-007).
  static toHttp(resumen: ResumenPedidoPortal) {
    return {
      tipo_entrega: resumen.tipo_entrega,
      direccion_perfil: resumen.direccion_perfil,
      direccion_entrega: resumen.direccion_entrega,
      // HU-B-009: tipo elegido y datos del receptor de la factura.
      comprobante: {
        tipo_comprobante: resumen.comprobante.tipo_comprobante,
        ruc: resumen.comprobante.ruc,
        razon_social: resumen.comprobante.razon_social,
      },
      comprobante_sugerido: resumen.comprobante_sugerido && {
        ruc: resumen.comprobante_sugerido.ruc,
        razon_social: resumen.comprobante_sugerido.razon_social,
      },
      items: resumen.items.map((item) => ({
        producto_presentacion_id: item.producto_presentacion_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_aplicado: item.precio_aplicado,
        es_mayorista: item.es_mayorista,
        subtotal: item.subtotal,
      })),
      subtotal: resumen.subtotal,
      total: resumen.total,
    };
  }
}
