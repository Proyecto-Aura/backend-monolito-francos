import { UsuarioRol as PrismaUsuarioRol } from '@prisma/client';
import { UsuarioRolEntity } from '../../domain/entities/usuario-rol.entity';

export class UsuarioRolMapper {
  static toDomain(usuarioRol: PrismaUsuarioRol): UsuarioRolEntity {
    return new UsuarioRolEntity(
      usuarioRol.id,
      usuarioRol.user_id,
      usuarioRol.rol_id,
      usuarioRol.estado,
      usuarioRol.created_at,
    );
  }
}
