import { SolicitudInsumosEntity } from '../../domain/entities';
import { SolicitudInsumosConDetalle } from '../../application/use-cases/solicitud-insumos/get-solicitud-insumos-by-id.use-case';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';
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
  static conDetalleToHttp(resultado: SolicitudInsumosConDetalle) {
    return {
      ...this.toHttp(resultado.solicitud),
      detalle: SolicitudInsumosDetallePresenter.listToHttp(resultado.detalle),
    };
  }

  static paginatedToHttp(result: PaginatedResult<SolicitudInsumosEntity>) {
    return {
      data: result.data.map((solicitud) => this.toHttp(solicitud)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
