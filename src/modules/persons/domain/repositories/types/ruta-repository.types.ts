import { PaginationParams } from './pagination.types';

export interface CreateRutaParams {
  nombre: string;
  estado: boolean;
  parent_id: number | null;
}

export interface UpdateRutaParams {
  nombre?: string;
}

export interface MoveRutaParams {
  parent_id: number | null;
}

export interface ListRutasParams extends PaginationParams {
  search?: string;
  estado?: boolean;
  parent_id?: number | null;
}

export interface RutaTreeNode {
  id: number;
  nombre: string;
  estado: boolean;
  parent_id: number | null;
  created_at: Date;
  updated_at: Date;
  children: RutaTreeNode[];
}
