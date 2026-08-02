import { ProductoEntity } from '../entities';
import { PaginatedResult } from './types/pagination.types';
import {
  CreateProductoParams,
  CreateProductoWithPresentacionesParams,
  ListProductosParams,
  ProductoWithPresentaciones,
  UpdateProductoParams,
} from './types/producto-repository.types';

export abstract class ProductoRepository {
  abstract create(params: CreateProductoParams): Promise<ProductoEntity>;
  abstract createWithPresentaciones(
    params: CreateProductoWithPresentacionesParams,
  ): Promise<ProductoWithPresentaciones>;
  abstract findById(id: number): Promise<ProductoEntity | null>;
  abstract findMany(
    params: ListProductosParams,
  ): Promise<PaginatedResult<ProductoEntity>>;
  abstract existsByName(nombre: string, excludeId?: number): Promise<boolean>;
  // se podria agregar buscar productos por categoria
  abstract update(
    id: number,
    params: UpdateProductoParams,
  ): Promise<ProductoEntity>;
  abstract setStatus(id: number, estado: boolean): Promise<ProductoEntity>;
}
