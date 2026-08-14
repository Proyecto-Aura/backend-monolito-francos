import { PaginationParams } from './pagination.types';

export interface CreateRolParams {
  nombre: string;
  descripcion: string | null;
  estado: boolean;
}

export interface UpdateRolParams {
  nombre?: string;
  descripcion?: string | null;
}

export interface ListRolesParams extends PaginationParams {
  search?: string;
  estado?: boolean;
}
