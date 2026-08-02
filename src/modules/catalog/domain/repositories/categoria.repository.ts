import { CategoriaEntity } from '../entities';
import {
  CreateCategoriaParams,
  ListCategoriasParams,
  UpdateCategoriaParams,
} from './types/categoria-repository.types';
import { PaginatedResult } from './types/pagination.types';

export abstract class CategoriaRepository {
  abstract create(params: CreateCategoriaParams): Promise<CategoriaEntity>;
  abstract findById(id: number): Promise<CategoriaEntity | null>;
  abstract findMany(
    params: ListCategoriasParams,
  ): Promise<PaginatedResult<CategoriaEntity>>;
  abstract existsByName(nombre: string, excludeId?: number): Promise<boolean>;
  abstract update(
    id: number,
    params: UpdateCategoriaParams,
  ): Promise<CategoriaEntity>;
  abstract setStatus(id: number, estado: boolean): Promise<CategoriaEntity>;
}
