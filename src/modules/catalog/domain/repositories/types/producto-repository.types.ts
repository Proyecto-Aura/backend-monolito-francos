import { ProductoEntity, ProductoPresentacionEntity } from '../../entities';
import { PaginationParams } from './pagination.types';
import { CreateProductoPresentacionAnidadoParams } from './producto_presentacion-repository.types';

export interface CreateProductoParams {
  nombre: string;
  categoria_id: number;
  descripcion: string | null;
  estado: boolean;
  destacado: boolean;
}

// Para insertar el producto con una o varias presentaciones.
export interface CreateProductoWithPresentacionesParams extends CreateProductoParams {
  producto_presentaciones: CreateProductoPresentacionAnidadoParams[];
}

// Resultado compuesto: producto creado con sus presentaciones.
// Representa un producto junto con sus presentaciones.
export interface ProductoWithPresentaciones extends ProductoEntity {
  producto_presentaciones: ProductoPresentacionEntity[];
}

export interface UpdateProductoParams {
  nombre?: string;
  categoria_id?: number;
  descripcion?: string | null;
  destacado?: boolean;
}

export interface ListProductosParams extends PaginationParams {
  search?: string;

  //filtros
  estado?: boolean;
  categoria_id?: number;
  destacado?: boolean;
}
