import { SolicitudInsumosEntity } from '../../domain/entities';
import { SolicitudInsumosResumen } from '../../domain/repositories/types/solicitud-insumos-repository.types';
import { SolicitudInsumosConDetalle } from '../../application/use-cases/solicitud-insumos/get-solicitud-insumos-by-id.use-case';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';
import { calcularDisponibilidadInsumos } from '../../application/utils/solicitud-insumos.utils';
import { SolicitudInsumosDetallePresenter } from './solicitud-insumos-detalle.presenter';

export class SolicitudInsumosPresenter {
  static toHttp(solicitud: SolicitudInsumosEntity) {
    return {
      id: solicitud.id,
      codigo_solicitud: solicitud.codigo_solicitud,
      solicitud_produccion_id: solicitud.solicitud_produccion_id,
      cantidad_insumos: solicitud.cantidad_insumos,
      estado: solicitud.estado,
      fecha_creacion: solicitud.fecha_creacion,
      fecha_limite: solicitud.fecha_limite,
      solicitado_por: solicitud.solicitado_por,
      solicitado_por_nombre: solicitud.solicitado_por_nombre,
      created_at: solicitud.created_at,
      updated_at: solicitud.updated_at,
    };
  }

  // GET :id: cabecera + lineas, para no obligar a una segunda llamada.
  // `disponibilidad` ('completo'|'parcial'|'sin_stock') es para la vista de
  // "Registrar entrega" de inventario, mismo criterio que
  // PedidoPresenter.detalleInventarioToHttp.
  static conDetalleToHttp(resultado: SolicitudInsumosConDetalle) {
    const detalle = SolicitudInsumosDetallePresenter.listToHttp(
      resultado.detalle,
    );

    return {
      ...this.toHttp(resultado.solicitud),
      detalle,
      disponibilidad: calcularDisponibilidadInsumos(detalle),
    };
  }

  // Fila del listado. `disponibilidad` solo viene si se pidió con
  // conDisponibilidad=true (vista de inventario, "solicitudes de insumos por
  // entregar"), mismo criterio que PedidoPresenter.resumenToHttp.
  static resumenToHttp({ solicitud, disponibilidad }: SolicitudInsumosResumen) {
    return {
      ...this.toHttp(solicitud),
      ...(disponibilidad ? { disponibilidad } : {}),
    };
  }

  static paginatedToHttp(result: PaginatedResult<SolicitudInsumosResumen>) {
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
}
