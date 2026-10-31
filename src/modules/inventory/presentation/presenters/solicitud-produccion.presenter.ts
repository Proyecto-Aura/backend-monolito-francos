import { SolicitudProduccionEntity } from '../../domain/entities';
import { SolicitudProduccionConDetalle } from '../../application/use-cases/solicitud-produccion/get-solicitud-produccion-by-id.use-case';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';
import { SolicitudProduccionDetallePresenter } from './solicitud-produccion-detalle.presenter';

export class SolicitudProduccionPresenter {
  static toHttp(solicitud: SolicitudProduccionEntity) {
    return {
      id: solicitud.id,
      codigo: solicitud.codigo,
      cantidad_productos: solicitud.cantidad_productos,
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
  static conDetalleToHttp(resultado: SolicitudProduccionConDetalle) {
    return {
      ...this.toHttp(resultado.solicitud),
      detalle: SolicitudProduccionDetallePresenter.listToHttp(
        resultado.detalle,
      ),
    };
  }

  static paginatedToHttp(result: PaginatedResult<SolicitudProduccionEntity>) {
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
