import { TipoDocumento } from '../../enums/persons.enums';
import { PaginationParams } from './pagination.types';

export interface CreatePersonaParams {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  telefono: string | null;
  fecha_nacimiento: Date | null;
  direccion: string | null;
  distrito_id?: string | null;
  estado: boolean;
}

export interface UpdatePersonaParams {
  nombres?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  tipo_documento?: TipoDocumento;
  numero_documento?: string;
  telefono?: string;
  fecha_nacimiento?: Date;
  direccion?: string;
  distrito_id?: string;
}

export interface ListPersonasParams extends PaginationParams {
  search?: string;
  estado?: boolean;
  tipo_documento?: TipoDocumento;
}
