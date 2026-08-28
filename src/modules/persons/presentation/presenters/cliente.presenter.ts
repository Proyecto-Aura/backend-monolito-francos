import { ClienteEntity } from '../../domain/entities/cliente.entity';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class ClientePresenter {
  static toHttp(cliente: ClienteEntity) {
    return {
      id: cliente.id,
      persona_id: cliente.persona_id,
      tipo_cliente: cliente.tipo_cliente,
      razon_social: cliente.razon_social,
      categoria_cliente: cliente.categoria_cliente,
      estado: cliente.estado,
      created_at: cliente.created_at,
      updated_at: cliente.updated_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<ClienteEntity>) {
    return {
      data: result.data.map((cliente) => this.toHttp(cliente)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}