import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  PedidoDetalle,
  PedidoResumen,
} from '../../domain/repositories/types/pedido-repository.types';

export class PedidoPresenter {
  // Fila del listado (RF-A030).
  static resumenToHttp({ pedido, cliente_nombre, metodo_pago }: PedidoResumen) {
    return {
      id: pedido.id,
      codigo: pedido.codigo,
      cliente: { id: pedido.cliente_id, nombre: cliente_nombre },
      metodo_pago,
      total: pedido.total,
      tipo_entrega: pedido.tipo_entrega,
      estado: pedido.estado,
      origen: pedido.origen,
      created_at: pedido.created_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<PedidoResumen>) {
    return {
      data: result.data.map((resumen) => this.resumenToHttp(resumen)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  // Detalle completo (RF-A031).
  static detalleToHttp({
    pedido,
    cliente_nombre,
    detalles,
    pago,
  }: PedidoDetalle) {
    return {
      id: pedido.id,
      codigo: pedido.codigo,
      cliente: { id: pedido.cliente_id, nombre: cliente_nombre },
      origen: pedido.origen,
      estado: pedido.estado,
      tipo_entrega: pedido.tipo_entrega,
      direccion_entrega: pedido.direccion_entrega,
      total: pedido.total,
      created_at: pedido.created_at,
      updated_at: pedido.updated_at,
      items: detalles.map(
        ({ detalle, sku, producto_nombre, presentacion }) => ({
          id: detalle.id,
          producto_presentacion_id: detalle.producto_presentacion_id,
          sku,
          producto: producto_nombre,
          presentacion,
          cantidad: detalle.cantidad,
          precio_unitario: detalle.precio_unitario,
          precio_aplicado: detalle.precio_aplicado,
          subtotal: detalle.subtotal,
        }),
      ),
      pago: pago
        ? {
            metodo_pago: pago.metodo_pago,
            monto: pago.monto,
            numero_operacion: pago.numero_operacion,
            fecha_pago: pago.fecha_pago,
            // La boleta o factura la genera HU-B-010; hasta entonces va vacía.
            comprobante: null,
          }
        : null,
    };
  }
}
