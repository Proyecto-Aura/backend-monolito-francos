import { Injectable } from '@nestjs/common';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { RolRepository } from '../../../domain/repositories/rol.repository';
import {
  ROL_ADMIN,
  UsuarioInterno,
} from '../../../domain/repositories/types/usuario-interno-repository.types';
import { UsuarioInternoRepository } from '../../../domain/repositories/usuario-interno.repository';
import { SetRolesUsuarioInternoDto } from '../../dto/usuario-interno-dtos/set-roles-usuario-interno.dto';
import { assertRolesAsignables, tieneRolAdmin } from './usuario-interno.rules';

@Injectable()
export class SetUsuarioInternoRolesUseCase {
  constructor(
    private readonly usuarioInternoRepository: UsuarioInternoRepository,
    private readonly rolRepository: RolRepository,
  ) {}

  async execute(
    id: string,
    dto: SetRolesUsuarioInternoDto,
    currentUserId: string,
  ): Promise<UsuarioInterno> {
    const usuario = await this.usuarioInternoRepository.findById(id);
    if (!usuario) {
      throw new ResourceNotFoundError('Usuario interno no encontrado');
    }

    const roles = await assertRolesAsignables(this.rolRepository, dto.rol_ids);
    const conservaAdmin = roles.some((rol) => rol.nombre === ROL_ADMIN);

    if (!conservaAdmin && tieneRolAdmin(usuario)) {
      if (id === currentUserId) {
        throw new ResourceConflictError('No puedes quitarte el rol admin');
      }
      if (
        usuario.user.estado &&
        (await this.usuarioInternoRepository.countActiveAdmins(id)) === 0
      ) {
        throw new ResourceConflictError(
          'No se puede quitar el rol admin al último administrador activo',
        );
      }
    }

    return this.usuarioInternoRepository.replaceRoles(id, dto.rol_ids);
  }
}
