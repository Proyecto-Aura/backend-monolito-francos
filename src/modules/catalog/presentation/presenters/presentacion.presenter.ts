import { PresentacionEntity } from '../../domain/entities';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class PresentacionPresenter {
  static toHttp(presentacion: PresentacionEntity) {
    return {
      id: presentacion.id,
      cantidad: presentacion.cantidad,
      unidad_medida: presentacion.unidad_medida,
      descripcion: presentacion.descripcion,
      estado: presentacion.estado,
      created_at: presentacion.created_at,
      updated_at: presentacion.updated_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<PresentacionEntity>) {
    return {
      data: result.data.map((presentacion) => this.toHttp(presentacion)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
