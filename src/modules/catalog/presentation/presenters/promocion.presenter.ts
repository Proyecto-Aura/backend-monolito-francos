import { PromocionEntity } from '../../domain/entities';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class PromocionPresenter {
  static toHttp(promocion: PromocionEntity) {
    return {
      id: promocion.id,
      producto_presentacion_id: promocion.producto_presentacion_id,
      nombre: promocion.nombre,
      valor: promocion.valor,
      cantidad_paga: promocion.cantidad_paga,
      cantidad_lleva: promocion.cantidad_lleva,
      cantidad_minima: promocion.cantidad_minima,
      producto_presentacion_regalo_id:
        promocion.producto_presentacion_regalo_id,
      fecha_inicio: promocion.fecha_inicio,
      fecha_fin: promocion.fecha_fin,
      estado: promocion.estado,
      tipo: promocion.tipo,
      created_at: promocion.created_at,
      updated_at: promocion.updated_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<PromocionEntity>) {
    return {
      data: result.data.map((promocion) => this.toHttp(promocion)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
