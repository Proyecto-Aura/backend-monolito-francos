import { PromocionEntity } from '../../entities';
import { UnidadMedidaPresentacion } from '../../enums';
import { PaginationParams } from './pagination.types';

export enum OrdenCatalogoPublico {
  PRECIO_ASC = 'precio_asc',
  PRECIO_DESC = 'precio_desc',
}

// Filtros que puede elegir el cliente del Portal B. Los de visibilidad
// (activo, visible en el Portal B, producto y categoría activos) no son
// parámetros: el repositorio los aplica siempre.
export interface ListCatalogoPublicoParams extends PaginationParams {
  // Busca solo en el nombre del producto.
  q?: string;
  categoria_id?: number;
  // Sin orden: primero los destacados y luego por nombre.
  orden?: OrdenCatalogoPublico;

  // Día (medianoche UTC) con el que se decide qué promoción está vigente.
  fecha_referencia: Date;
}

export interface CatalogoPublicoCategoria {
  id: number;
  nombre: string;
}

// Una presentación visible en el catálogo público, sin datos internos
// (sku, stock, visibilidad ni auditoría).
export interface CatalogoPublicoPresentacion {
  id: number;
  slug: string | null;
  precio_unitario: number;
  imagen_key: string | null;
  presentacion: {
    id: number;
    cantidad: number;
    unidad_medida: UnidadMedidaPresentacion;
    descripcion: string | null;
  };
  // Hay stock del producto terminado (mayor que 0).
  disponible: boolean;
  promocion_vigente: PromocionEntity | null;
}

// Una fila del listado público: la presentación junto a su producto.
export interface CatalogoPublicoItem extends CatalogoPublicoPresentacion {
  producto: {
    id: number;
    nombre: string;
    descripcion: string | null;
    destacado: boolean;
    categoria: CatalogoPublicoCategoria;
  };
}

// El detalle público: el producto con sus presentaciones visibles.
export interface CatalogoPublicoProducto {
  id: number;
  nombre: string;
  descripcion: string | null;
  destacado: boolean;
  categoria: CatalogoPublicoCategoria;
  presentaciones: CatalogoPublicoPresentacion[];
}
