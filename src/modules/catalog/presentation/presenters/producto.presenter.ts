import { ProductoEntity } from '../../domain/entities';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import { ProductoCatalogo } from '../../domain/repositories/types/producto-repository.types';
import { ProductoPresentacionPresenter } from './producto_presentacion.presenter';

export class ProductoPresenter {
  static toHttp(producto: ProductoEntity) {
    return {
      id: producto.id,
      categoria_id: producto.categoria_id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      estado: producto.estado,
      destacado: producto.destacado,
      created_at: producto.created_at,
      updated_at: producto.updated_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<ProductoCatalogo>) {
    return {
      data: result.data.map((producto) =>
        this.withPresentacionesToHttp(producto),
      ),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  static withPresentacionesToHttp(producto: ProductoCatalogo) {
    return {
      ...this.toHttp(producto),
      producto_presentaciones: producto.producto_presentaciones.map((item) =>
        ProductoPresentacionPresenter.withPromocionesToHttp(item),
      ),
    };
  }
}
