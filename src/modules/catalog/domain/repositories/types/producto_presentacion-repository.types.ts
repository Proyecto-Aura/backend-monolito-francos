import { ProductoPresentacionEntity, PromocionEntity } from '../../entities';
import {
  NivelStockProductoTerminado,
  UnidadMedidaPresentacion,
} from '../../enums';
import { PaginationParams } from './pagination.types';

export interface CreateProductoPresentacionParams {
  sku: string;
  precio_unitario: number;
  precio_mayorista: number | null;
  umbral_mayorista: number | null;
  producto_id: number;
  presentacion_id: number;
  imagen_key: string | null;
  slug: string | null;
  estado: boolean;
}

// Datos para crear presentaciones junto con el producto, sin producto_id ni sku.
export type CreateProductoPresentacionAnidadoParams = Omit<
  CreateProductoPresentacionParams,
  'producto_id' | 'sku'
>;

export interface UpdateProductoPresentacionParams {
  precio_unitario?: number;
  precio_mayorista?: number | null;
  umbral_mayorista?: number | null;
  imagen_key?: string | null;
}

export interface ListProductoPresentacionesParams extends PaginationParams {
  // Busca en el SKU, el slug y el nombre del producto.
  search?: string;

  //filtros
  estado?: boolean;
  categoria_id?: number;
  presentacion_id?: number;
  // true: solo con stock disponible; false: agotadas (sin stock).
  con_stock?: boolean;
  // Mismo criterio que /productos-terminados/indicadores (90%, sin tope
  // definido nunca cuenta como "alto").
  nivel?: NivelStockProductoTerminado;

  // Día (medianoche UTC) con el que se decide qué promoción está vigente.
  fecha_referencia: Date;
}

// Una fila del catálogo: la presentación de un producto con los datos que el
// listado necesita mostrar junto a ella.
export interface ProductoPresentacionCatalogo extends ProductoPresentacionEntity {
  visible_portal_b: boolean;
  producto: {
    id: number;
    nombre: string;
    descripcion: string | null;
    destacado: boolean;
    estado: boolean;
    categoria: { id: number; nombre: string };
  };
  presentacion: {
    id: number;
    cantidad: number;
    unidad_medida: UnidadMedidaPresentacion;
    descripcion: string | null;
  };
  producto_terminado: {
    // Id propio de producto_terminado (no es producto_presentacion_id): lo
    // necesita el front para los endpoints de lotes/movimientos de producto
    // terminado (OFT0-259), que identifican el producto por este id.
    id: number;
    stock_actual: number;
    stock_minimo: number;
    stock_maximo: number | null;
  } | null;
  promocion_vigente: PromocionEntity | null;
}
