import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import { UsuarioInterno } from '../../domain/repositories/types/usuario-interno-repository.types';

// Lista explícita de campos: nunca se exponen contraseña, hash ni tokens.
export class UsuarioInternoPresenter {
  static toHttp({ user, persona, roles }: UsuarioInterno) {
    return {
      id: user.id,
      persona_id: persona.id,
      nombres: persona.nombres,
      apellido_paterno: persona.apellido_paterno,
      apellido_materno: persona.apellido_materno,
      tipo_documento: persona.tipo_documento,
      numero_documento: persona.numero_documento,
      email: user.email,
      username: user.username,
      estado: user.estado,
      email_verificado: user.email_verificado,
      debe_cambiar_contrasena: user.debe_cambiar_contrasena,
      roles: roles.map((rol) => ({ id: rol.rol_id, nombre: rol.nombre })),
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<UsuarioInterno>) {
    return {
      data: result.data.map((usuario) => this.toHttp(usuario)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
