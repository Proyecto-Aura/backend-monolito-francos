import { RutaEntity } from '../../domain/entities/ruta.entity';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import { RutaTreeNode } from '../../domain/repositories/types/ruta-repository.types';

export interface RutaTreeResponse {
  id: number;
  nombre: string;
  estado: boolean;
  parent_id: number | null;
  created_at: Date;
  updated_at: Date;
  children: RutaTreeResponse[];
}

export class RutaPresenter {
  static toHttp(ruta: RutaEntity) {
    return {
      id: ruta.id,
      nombre: ruta.nombre,
      estado: ruta.estado,
      parent_id: ruta.parent_id,
      created_at: ruta.created_at,
      updated_at: ruta.updated_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<RutaEntity>) {
    return {
      data: result.data.map((ruta) => this.toHttp(ruta)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  static treeToHttp(nodes: RutaTreeNode[]): RutaTreeResponse[] {
    return nodes.map((node): RutaTreeResponse => ({
      id: node.id,
      nombre: node.nombre,
      estado: node.estado,
      parent_id: node.parent_id,
      created_at: node.created_at,
      updated_at: node.updated_at,
      children: this.treeToHttp(node.children),
    }));
  }
}
