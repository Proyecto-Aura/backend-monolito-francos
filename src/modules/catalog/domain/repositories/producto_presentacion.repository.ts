import { ProductoPresentacionEntity } from '../entities';
import { PaginatedResult } from './types/pagination.types';
import {
  CreateProductoPresentacionParams,
  ListProductoPresentacionesParams,
  ProductoPresentacionCatalogo,
  UpdateProductoPresentacionParams,
} from './types/producto_presentacion-repository.types';

export abstract class ProductoPresentacionRepository {
  abstract create(
    params: CreateProductoPresentacionParams,
  ): Promise<ProductoPresentacionEntity>;
  abstract findById(id: number): Promise<ProductoPresentacionEntity | null>;
  abstract findMany(
    params: ListProductoPresentacionesParams,
  ): Promise<PaginatedResult<ProductoPresentacionCatalogo>>;
  abstract existsBySku(nombre: string, excludeId?: number): Promise<boolean>;
  abstract existsBySlug(slug: string): Promise<boolean>;
  abstract update(
    id: number,
    params: UpdateProductoPresentacionParams,
  ): Promise<ProductoPresentacionEntity>;
  abstract setStatus(
    id: number,
    estado: boolean,
  ): Promise<ProductoPresentacionEntity>;
}
