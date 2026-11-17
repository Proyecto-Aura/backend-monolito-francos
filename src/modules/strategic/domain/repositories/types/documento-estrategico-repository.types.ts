import { PaginationParams } from './pagination.types';

export interface CreateDocumentoEstrategicoParams {
  plan_estrategico_id: number;
  nombre: string;
  ruta_archivo: string;
  nombre_original: string | null;
}

export interface ListDocumentosEstrategicosParams extends PaginationParams {
  plan_estrategico_id: number;
  tipo_modulo_id: number;
  search?: string;
}
