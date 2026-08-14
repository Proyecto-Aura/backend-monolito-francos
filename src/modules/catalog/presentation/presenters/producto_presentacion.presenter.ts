import { ProductoPresentacionEntity } from '../../domain/entities';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class ProductoPresentacionPresenter {
  static toHttp(producto_presentacion: ProductoPresentacionEntity) {
    return {
      id: producto_presentacion.id,
      sku: producto_presentacion.sku,
      precio_unitario: producto_presentacion.precio_unitario,
      precio_mayorista: producto_presentacion.precio_mayorista,
      umbral_mayorista: producto_presentacion.umbral_mayorista,
      producto_id: producto_presentacion.producto_id,
      presentacion_id: producto_presentacion.presentacion_id,
      imagen_url: producto_presentacion.imagen_url,
      slug: producto_presentacion.slug,
      estado: producto_presentacion.estado,
      created_at: producto_presentacion.created_at,
      updated_at: producto_presentacion.updated_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<ProductoPresentacionEntity>) {
    return {
      data: result.data.map((producto) => this.toHttp(producto)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
