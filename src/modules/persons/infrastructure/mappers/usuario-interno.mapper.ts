import { Prisma } from '@prisma/client';
import { UsuarioInterno } from '../../domain/repositories/types/usuario-interno-repository.types';
import { EmpleadoMapper } from './empleado.mapper';
import { PersonaMapper } from './persona.mapper';
import { UserMapper } from './user.mapper';

export const USUARIO_INTERNO_INCLUDE = {
  persona: { include: { empleado: true } },
  usuario_roles: {
    where: { estado: true },
    include: { rol: true },
    orderBy: { rol_id: 'asc' },
  },
} satisfies Prisma.UserInclude;

export type PrismaUsuarioInterno = Prisma.UserGetPayload<{
  include: typeof USUARIO_INTERNO_INCLUDE;
}>;

export class UsuarioInternoMapper {
  static toDomain(user: PrismaUsuarioInterno): UsuarioInterno {
    return {
      user: UserMapper.toDomain(user),
      persona: PersonaMapper.toDomain(user.persona),
      empleado: user.persona.empleado
        ? EmpleadoMapper.toDomain(user.persona.empleado)
        : null,
      roles: user.usuario_roles.map((usuarioRol) => ({
        rol_id: usuarioRol.rol.id,
        nombre: usuarioRol.rol.nombre,
      })),
    };
  }
}
