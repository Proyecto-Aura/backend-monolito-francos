import { PaginationParams } from './pagination.types';

export interface CreateEmpresaParams {
  razon_social: string;
  ruc: string;
  direccion: string;
  telefono: string | null;
  email: string | null;
  logo_url: string | null;
  estado: boolean;
  es_emisora: boolean;
}

export interface UpdateEmpresaParams {
  razon_social?: string;
  ruc?: string;
  direccion?: string;
  telefono?: string | null;
  email?: string | null;
  logo_url?: string | null;
}

export interface ListEmpresasParams extends PaginationParams {
  search?: string;
  estado?: boolean;
}
