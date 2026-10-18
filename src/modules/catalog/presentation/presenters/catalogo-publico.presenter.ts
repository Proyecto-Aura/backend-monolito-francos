import { envs } from '../../../../config/envs';
import {
  calcularPrecioFinal,
  describirPromocion,
} from '../../application/utils/precio-final.utils';
import { formatFechaDia } from '../../application/utils/promocion.utils';
import { PromocionEntity } from '../../domain/entities';
import {
  CatalogoPublicoItem,
  CatalogoPublicoPresentacion,
  CatalogoPublicoProducto,
} from '../../domain/repositories/types/catalogo-publico-repository.types';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

// Respuesta del catálogo público (Portal B). A propósito no expone sku,
// visible_portal_b, stock ni timestamps: el stock sale solo como `disponible`.
export class CatalogoPublicoPresenter {
  private static promocionToHttp(promocion: PromocionEntity | null) {
    return promocion
      ? {
          tipo: promocion.tipo,
          nombre: promocion.nombre,
          descripcion: describirPromocion(promocion),
          valor: promocion.valor,
          cantidad_paga: promocion.cantidad_paga,
          cantidad_lleva: promocion.cantidad_lleva,
          fecha_inicio: formatFechaDia(promocion.fecha_inicio),
          fecha_fin: formatFechaDia(promocion.fecha_fin),
        }
      : null;
  }

  private static presentacionToHttp(fila: CatalogoPublicoPresentacion) {
    return {
      id: fila.id,
      slug: fila.slug,
      presentacion: fila.presentacion,
      imagen_url: fila.imagen_key
        ? `${envs.mediaBaseUrl}/${fila.imagen_key}`
        : null,
      precio: fila.precio_unitario,
      precio_final: calcularPrecioFinal(
        fila.precio_unitario,
        fila.promocion_vigente,
      ),
      disponible: fila.disponible,
      promocion: this.promocionToHttp(fila.promocion_vigente),
    };
  }

  // Fila del listado: una por presentación, con los datos de su producto.
  static itemToHttp(item: CatalogoPublicoItem) {
    const { id, slug, ...presentacion } = this.presentacionToHttp(item);

    return {
      id,
      slug,
      producto_id: item.producto.id,
      nombre: item.producto.nombre,
      descripcion: item.producto.descripcion,
      destacado: item.producto.destacado,
      categoria: item.producto.categoria,
      ...presentacion,
    };
  }

  static productoToHttp(producto: CatalogoPublicoProducto) {
    return {
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      destacado: producto.destacado,
      categoria: producto.categoria,
      presentaciones: producto.presentaciones.map((fila) =>
        this.presentacionToHttp(fila),
      ),
    };
  }

  static paginatedToHttp(result: PaginatedResult<CatalogoPublicoItem>) {
    return {
      data: result.data.map((item) => this.itemToHttp(item)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
