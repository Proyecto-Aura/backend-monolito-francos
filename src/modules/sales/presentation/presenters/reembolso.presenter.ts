import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  ReembolsoConPedido,
  ReembolsoDetalle,
} from '../../domain/repositories/types/reembolso-repository.types';

// El archivo se guarda como reembolsos/<solicitud>/<nombre>; se muestra el nombre.
const nombreArchivo = (key: string): string => key.split('/').pop() ?? key;

export class ReembolsoPresenter {
  // Fila del listado (RF-A039).
  static resumenToHttp({
    reembolso,
    pedido_id,
    pedido_codigo,
    cliente_nombre,
    metodo_pago,
  }: ReembolsoConPedido) {
    return {
      id: reembolso.id,
      codigo: reembolso.codigo,
      pedido: { id: pedido_id, codigo: pedido_codigo },
      cliente: { nombre: cliente_nombre },
      metodo_pago,
      monto: reembolso.monto,
      estado: reembolso.estado,
      fecha_solicitud: reembolso.fecha_solicitud,
    };
  }

  static paginatedToHttp(result: PaginatedResult<ReembolsoConPedido>) {
    return {
      data: result.data.map((solicitud) => this.resumenToHttp(solicitud)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  // Detalle completo (RF-A041).
  static detalleToHttp(detalle: ReembolsoDetalle) {
    const { reembolso, evidencia_url } = detalle;

    return {
      ...this.resumenToHttp(detalle),
      motivo_cliente: reembolso.motivo_cliente,
      evidencia:
        reembolso.evidencia_key && evidencia_url
          ? {
              nombre: nombreArchivo(reembolso.evidencia_key),
              url: evidencia_url,
            }
          : null,
      motivo_rechazo: reembolso.motivo_rechazo,
      fecha_resolucion: reembolso.fecha_resolucion,
    };
  }
}
