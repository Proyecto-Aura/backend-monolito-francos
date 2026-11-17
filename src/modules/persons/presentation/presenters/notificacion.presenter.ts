import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import { NotificacionDeUsuario } from '../../domain/repositories/types/notificacion-repository.types';

export class NotificacionPresenter {
  static toHttp({ notificacion, leido, fecha_leido }: NotificacionDeUsuario) {
    return {
      id: notificacion.id,
      tipo: notificacion.tipo,
      titulo: notificacion.titulo,
      mensaje: notificacion.mensaje,
      referencia_id: notificacion.referencia_id,
      referencia_tipo: notificacion.referencia_tipo,
      leido,
      fecha_leido,
      created_at: notificacion.created_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<NotificacionDeUsuario>) {
    return {
      data: result.data.map((fila) => this.toHttp(fila)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
