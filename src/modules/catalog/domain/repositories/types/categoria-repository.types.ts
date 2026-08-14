import { PaginationParams } from './pagination.types';

export interface CreateCategoriaParams {
  nombre: string;
  descripcion: string | null;
  estado: boolean;
}

export interface UpdateCategoriaParams {
  nombre?: string;
  descripcion?: string | null;
}

export interface ListCategoriasParams extends PaginationParams {
  search?: string;
  estado?: boolean;
}
