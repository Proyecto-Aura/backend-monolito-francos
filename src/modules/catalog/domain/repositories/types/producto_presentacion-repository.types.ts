import { PaginationParams } from './pagination.types';

export interface CreateProductoPresentacionParams {
  sku: string;
  precio_unitario: number;
  precio_mayorista: number | null;
  umbral_mayorista: number | null;
  producto_id: number;
  presentacion_id: number;
  imagen_url: string | null;
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
  imagen_url?: string | null;
}

export interface ListProductoPresentacionesParams extends PaginationParams {
  search?: string;

  //filtros
  estado?: boolean;
}
