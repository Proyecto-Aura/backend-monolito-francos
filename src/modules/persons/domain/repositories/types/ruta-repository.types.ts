import { PaginationParams } from './pagination.types';

export interface CreateRutaParams {
  nombre: string;
  etiqueta: string;
  icono: string;
  descripcion: string | null;
  estado: boolean;
  parent_id: number | null;
}

export interface UpdateRutaParams {
  nombre?: string;
  etiqueta?: string;
  icono?: string;
  descripcion?: string | null;
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
  etiqueta: string;
  icono: string;
  descripcion: string | null;
  estado: boolean;
  parent_id: number | null;
  created_at: Date;
  updated_at: Date;
  children: RutaTreeNode[];
}
