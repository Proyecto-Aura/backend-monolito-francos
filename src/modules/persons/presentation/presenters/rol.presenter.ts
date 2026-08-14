import { RolEntity } from '../../domain/entities/rol.entity';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class RolPresenter {
  // este toHttp nos permite reponder como queramos al Http
  static toHttp(rol: RolEntity) {
    return {
      id: rol.id,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      estado: rol.estado,
      created_at: rol.created_at,
      updated_at: rol.updated_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<RolEntity>) {
    return {
      data: result.data.map((rol) => this.toHttp(rol)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
