import { CategoriaCliente, TipoCliente } from '../../enums/persons.enums';
import { PaginationParams } from './pagination.types';

export interface CreateClienteParams {
  persona_id: string;
  tipo_cliente: TipoCliente;
  razon_social: string | null;
  categoria_cliente: CategoriaCliente;
  estado: boolean;
}

export interface UpdateClienteParams {
  tipo_cliente?: TipoCliente;
  razon_social?: string;
  categoria_cliente?: CategoriaCliente;
}

export interface ListClientesParams extends PaginationParams {
  search?: string;
  estado?: boolean;
  tipo_cliente?: TipoCliente;
  categoria_cliente?: CategoriaCliente;
}
