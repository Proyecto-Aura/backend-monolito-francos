import {
  ProductoEntity,
  ProductoPresentacionEntity,
  PromocionEntity,
} from '../../entities';
import { PaginationParams } from './pagination.types';
import { CreateProductoPresentacionAnidadoParams } from './producto_presentacion-repository.types';
import { CreatePromocionParams } from './promocion-repository.types';

export interface CreateProductoParams {
  nombre: string;
  categoria_id: number;
  descripcion: string | null;
  estado: boolean;
  destacado: boolean;
}

// Para insertar el producto con una o varias presentaciones.
export interface CreateProductoWithPresentacionesParams extends CreateProductoParams {
  producto_presentaciones: CreateProductoPresentacionConPromocionesParams[];
}

export interface CreateProductoPresentacionConPromocionesParams extends CreateProductoPresentacionAnidadoParams {
  promociones: CreatePromocionAnidadaParams[];
}

export type CreatePromocionAnidadaParams = Omit<
  CreatePromocionParams,
  'producto_presentacion_id'
>;

export interface UpsertPromocionAnidadaParams extends CreatePromocionAnidadaParams {
  id?: number;
}

export interface UpdateProductoPresentacionAnidadaParams {
  id: number;
  precio_unitario?: number;
  precio_mayorista?: number | null;
  umbral_mayorista?: number | null;
  imagen_url?: string | null;
  slug?: string | null;
  promociones?: UpsertPromocionAnidadaParams[];
}

export interface ProductoPresentacionWithPromociones extends ProductoPresentacionEntity {
  promociones: PromocionEntity[];
}

export interface ProductoCatalogo extends ProductoEntity {
  producto_presentaciones: ProductoPresentacionWithPromociones[];
}

export interface UpdateProductoParams {
  nombre?: string;
  categoria_id?: number;
  descripcion?: string | null;
  destacado?: boolean;
}

export interface UpdateProductoWithPresentacionesParams extends UpdateProductoParams {
  producto_presentaciones?: UpdateProductoPresentacionAnidadaParams[];
}

export interface ListProductosParams extends PaginationParams {
  search?: string;

  //filtros
  estado?: boolean;
  categoria_id?: number;
  destacado?: boolean;
}
