import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  PedidoDetalle,
  PedidoResumen,
  PedidoResumenPortal,
} from '../../domain/repositories/types/pedido-repository.types';
import { codigoComprobante } from '../../application/utils/comprobante.utils';
import { calcularDisponibilidad } from '../../application/utils/pedido.utils';

export class PedidoPresenter {
  static resumenPortalToHttp({
    pedido,
    metodo_pago,
    reembolso,
  }: PedidoResumenPortal) {
    return {
      id: pedido.id,
      codigo: pedido.codigo,
      estado: pedido.estado,
      tipo_entrega: pedido.tipo_entrega,
      total: pedido.total,
      metodo_pago,
      fecha_entrega: pedido.fecha_entrega,
      created_at: pedido.created_at,
      reembolso,
    };
  }

  static paginatedPortalToHttp(result: PaginatedResult<PedidoResumenPortal>) {
    return {
      data: result.data.map((resumen) => this.resumenPortalToHttp(resumen)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  // Fila del listado (RF-A030). `disponibilidad` solo viene si el listado se
  // pidió con conDisponibilidad (vista de inventario, "Pedidos por preparar").
  static resumenToHttp({
    pedido,
    cliente_nombre,
    metodo_pago,
    cantidad_productos,
    cantidad_unidades,
    disponibilidad,
  }: PedidoResumen) {
    return {
      id: pedido.id,
      codigo: pedido.codigo,
      cliente: { id: pedido.cliente_id, nombre: cliente_nombre },
      metodo_pago,
      total: pedido.total,
      tipo_entrega: pedido.tipo_entrega,
      estado: pedido.estado,
      origen: pedido.origen,
      productos: cantidad_productos,
      unidades: cantidad_unidades,
      fecha_entrega: pedido.fecha_entrega,
      created_at: pedido.created_at,
      ...(disponibilidad ? { disponibilidad } : {}),
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
    comprobante,
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
      fecha_entrega: pedido.fecha_entrega,
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
            // Boleta o factura (HU-B-010); null si aún no se emitió.
            comprobante: comprobante
              ? {
                  tipo: comprobante.tipo,
                  codigo: codigoComprobante(
                    comprobante.serie,
                    comprobante.numero,
                  ),
                  serie: comprobante.serie,
                  numero: comprobante.numero,
                  ruc: comprobante.ruc,
                  razon_social: comprobante.razon_social,
                  subtotal: comprobante.subtotal,
                  total: comprobante.total,
                  fecha_emision: comprobante.created_at,
                }
              : null,
          }
        : null,
    };
  }

  // Detalle para inventario: igual al general, más el stock actual por item
  // y si alcanza para completar el pedido (mockup "Pedidos por preparar").
  static detalleInventarioToHttp(pedidoDetalle: PedidoDetalle) {
    const base = this.detalleToHttp(pedidoDetalle);
    const items = base.items.map((item, i) => ({
      ...item,
      stock_disponible: pedidoDetalle.detalles[i].stock_disponible,
    }));

    return {
      ...base,
      items,
      disponibilidad: calcularDisponibilidad(items),
    };
  }
}
