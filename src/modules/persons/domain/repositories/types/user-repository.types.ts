import { PaginationParams } from './pagination.types';

export interface CreateUserParams {
  persona_id: string;
  email: string;
  username: string;
  contrasena: string;
  estado: boolean;
  email_verificado: boolean;
  debe_cambiar_contrasena: boolean;
  token_verificacion_email: string | null;
  token_verificacion_email_expiracion: Date | null;
}

// por el momento update tiene esta estructura
export interface UpdateUserParams {
  email?: string;
  username?: string;
  contrasena?: string;
  estado?: boolean;
}

export interface ListUsersParams extends PaginationParams {
  search?: string;
  estado?: boolean;
}
