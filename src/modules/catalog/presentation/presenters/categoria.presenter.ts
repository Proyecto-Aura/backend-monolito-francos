import { CategoriaEntity } from '../../domain/entities';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class CategoriaPresenter {
  static toHttp(categoria: CategoriaEntity) {
    return {
      id: categoria.id,
      nombre: categoria.nombre,
      descripcion: categoria.descripcion,
      estado: categoria.estado,
      created_at: categoria.created_at,
      updated_at: categoria.updated_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<CategoriaEntity>) {
    return {
      data: result.data.map((categoria) => this.toHttp(categoria)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
