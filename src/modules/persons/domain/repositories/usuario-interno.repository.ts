import { PaginatedResult } from './types/pagination.types';
import {
  CreateUsuarioInternoParams,
  ListUsuariosInternosParams,
  UpdateUsuarioInternoParams,
  UsuarioInterno,
} from './types/usuario-interno-repository.types';

// Opera sobre persona + user + usuario_rol (+ refresh_token) como un todo.
// Las escrituras que tocan varias tablas son transaccionales.
export abstract class UsuarioInternoRepository {
  abstract create(params: CreateUsuarioInternoParams): Promise<UsuarioInterno>;

  // Devuelve null si el usuario no existe o no es interno.
  abstract findById(id: string): Promise<UsuarioInterno | null>;

  abstract findMany(
    params: ListUsuariosInternosParams,
  ): Promise<PaginatedResult<UsuarioInterno>>;

  abstract update(
    id: string,
    params: UpdateUsuarioInternoParams,
  ): Promise<UsuarioInterno>;

  // Al desactivar, revoca todos los refresh tokens vigentes del usuario.
  abstract setStatus(id: string, estado: boolean): Promise<UsuarioInterno>;

  // Deja activos exactamente los roles indicados (sin tocar `cliente`).
  abstract replaceRoles(id: string, rolIds: number[]): Promise<UsuarioInterno>;

  // Usuarios activos con el rol `admin` activo, excluyendo `excludeUserId`.
  abstract countActiveAdmins(excludeUserId: string): Promise<number>;
}
