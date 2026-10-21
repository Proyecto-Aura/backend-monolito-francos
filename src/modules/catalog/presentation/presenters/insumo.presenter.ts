import { InsumoEntity } from '../../domain/entities';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class InsumoPresenter {
  static toHttp(insumo: InsumoEntity) {
    return {
      id: insumo.id,
      sku: insumo.sku,
      nombre: insumo.nombre,
      descripcion: insumo.descripcion,
      unidad_medida: insumo.unidad_medida,
      stock_actual: insumo.stock_actual,
      stock_minimo: insumo.stock_minimo,
      stock_maximo: insumo.stock_maximo,
      tipo: insumo.tipo,
      estado: insumo.estado,
      created_at: insumo.created_at,
      updated_at: insumo.updated_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<InsumoEntity>) {
    return {
      data: result.data.map((insumo) => this.toHttp(insumo)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
