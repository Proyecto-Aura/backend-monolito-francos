import { RolEntity } from '../../../domain/entities/rol.entity';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { RolRepository } from '../../../domain/repositories/rol.repository';
import {
  ROL_ADMIN,
  ROL_CLIENTE,
  UsuarioInterno,
} from '../../../domain/repositories/types/usuario-interno-repository.types';

// Mismas validaciones que register-empleado.use-case.ts (404 si no existe,
// 409 si está inactivo), más la regla de no asignar `cliente` (D4).
export async function assertRolesAsignables(
  rolRepository: RolRepository,
  rolIds: number[],
): Promise<RolEntity[]> {
  const roles: RolEntity[] = [];
  for (const rolId of rolIds) {
    const rol = await rolRepository.findById(rolId);
    if (!rol) {
      throw new ResourceNotFoundError(`El rol ${rolId} no existe`);
    }
    if (!rol.estado) {
      throw new ResourceConflictError(`El rol ${rol.nombre} no está activo`);
    }
    if (rol.nombre === ROL_CLIENTE) {
      throw new ResourceConflictError(
        'El rol cliente no puede asignarse a un usuario interno',
      );
    }
    roles.push(rol);
  }
  return roles;
}

export function tieneRolAdmin(usuario: UsuarioInterno): boolean {
  return usuario.roles.some((rol) => rol.nombre === ROL_ADMIN);
}
