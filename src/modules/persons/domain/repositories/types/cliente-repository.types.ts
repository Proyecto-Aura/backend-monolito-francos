import { ClienteEntity } from '../../entities/cliente.entity';
import { PersonaEntity } from '../../entities/persona.entity';
import { CategoriaCliente, TipoCliente } from '../../enums/persons.enums';
import { PaginationParams } from './pagination.types';
import { UbigeoItem } from '../ubigeo.repository';
import { UpdatePersonaParams } from './persona-repository.types';

export interface UpdateClienteParams {
  tipo_cliente?: TipoCliente;
  razon_social?: string | null;
  categoria_cliente?: CategoriaCliente;
}

export interface UpdateClienteConPersonaParams {
  persona_id: string;
  persona: UpdatePersonaParams;
  cliente: UpdateClienteParams;
}

export interface ListClientesParams extends PaginationParams {
  search?: string;
  estado?: boolean;
  tipo_cliente?: TipoCliente;
  categoria_cliente?: CategoriaCliente;
  // Ubicación: cada nivel acota más que el anterior.
  departamento_id?: string;
  provincia_id?: string;
  distrito_id?: string;
}

export interface UbicacionCliente {
  departamento: UbigeoItem;
  provincia: UbigeoItem;
  distrito: UbigeoItem;
}

// Modelo de lectura: un cliente junto con su persona y el correo de su cuenta
// (null si el cliente no tiene cuenta) y su ubicación (null si no la registró).
// No es una entidad de dominio.
export interface ClienteConPersona {
  cliente: ClienteEntity;
  persona: PersonaEntity;
  email: string | null;
  ubicacion: UbicacionCliente | null;
}
