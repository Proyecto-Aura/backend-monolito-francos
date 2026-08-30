import { ProductoEntity } from '../entities';
import { PaginatedResult } from './types/pagination.types';
import {
  CreateProductoParams,
  CreateProductoWithPresentacionesParams,
  ListProductosParams,
  ProductoCatalogo,
  UpdateProductoParams,
  UpdateProductoWithPresentacionesParams,
} from './types/producto-repository.types';

export abstract class ProductoRepository {
  abstract create(params: CreateProductoParams): Promise<ProductoEntity>;
  abstract createWithPresentaciones(
    params: CreateProductoWithPresentacionesParams,
  ): Promise<ProductoCatalogo>;
  abstract findById(id: number): Promise<ProductoCatalogo | null>;
  abstract findMany(
    params: ListProductosParams,
  ): Promise<PaginatedResult<ProductoCatalogo>>;
  abstract existsByName(nombre: string, excludeId?: number): Promise<boolean>;
  // se podria agregar buscar productos por categoria
  abstract update(
    id: number,
    params: UpdateProductoParams,
  ): Promise<ProductoEntity>;
  abstract updateWithPresentaciones(
    id: number,
    params: UpdateProductoWithPresentacionesParams,
  ): Promise<ProductoCatalogo>;
  abstract setStatus(id: number, estado: boolean): Promise<ProductoEntity>;
}
