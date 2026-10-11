import { ProductoPresentacionEntity } from '../../domain/entities';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import { ProductoPresentacionCatalogo } from '../../domain/repositories/types/producto_presentacion-repository.types';
import { formatFechaDia } from '../../application/utils/promocion.utils';
import { envs } from '../../../../config/envs';

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
      imagen_url: producto_presentacion.imagen_key
        ? `${envs.mediaBaseUrl}/${producto_presentacion.imagen_key}`
        : null,
      slug: producto_presentacion.slug,
      estado: producto_presentacion.estado,
      created_at: producto_presentacion.created_at,
      updated_at: producto_presentacion.updated_at,
    };
  }

  // Fila del listado del catálogo: la presentación con su producto, categoría,
  // stock, visibilidad y la promoción que está vigente hoy.
  static catalogoToHttp(fila: ProductoPresentacionCatalogo) {
    const promocion = fila.promocion_vigente;

    return {
      ...this.toHttp(fila),
      visible_portal_b: fila.visible_portal_b,
      producto: fila.producto,
      presentacion: fila.presentacion,
      producto_terminado: fila.producto_terminado,
      promocion_vigente: promocion
        ? {
            id: promocion.id,
            nombre: promocion.nombre,
            valor: promocion.valor,
            fecha_inicio: formatFechaDia(promocion.fecha_inicio),
            fecha_fin: formatFechaDia(promocion.fecha_fin),
          }
        : null,
    };
  }

  static paginatedToHttp(
    result: PaginatedResult<ProductoPresentacionCatalogo>,
  ) {
    return {
      data: result.data.map((fila) => this.catalogoToHttp(fila)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
