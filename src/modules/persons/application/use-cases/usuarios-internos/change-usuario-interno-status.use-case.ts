import { Injectable } from '@nestjs/common';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { UsuarioInterno } from '../../../domain/repositories/types/usuario-interno-repository.types';
import { UsuarioInternoRepository } from '../../../domain/repositories/usuario-interno.repository';
import { tieneRolAdmin } from './usuario-interno.rules';

@Injectable()
export class ChangeUsuarioInternoStatusUseCase {
  constructor(
    private readonly usuarioInternoRepository: UsuarioInternoRepository,
  ) {}

  async execute(
    id: string,
    estado: boolean,
    currentUserId: string,
  ): Promise<UsuarioInterno> {
    const usuario = await this.usuarioInternoRepository.findById(id);
    if (!usuario) {
      throw new ResourceNotFoundError('Usuario interno no encontrado');
    }

    if (!estado) {
      if (id === currentUserId) {
        throw new ResourceConflictError(
          'No puedes desactivar tu propio usuario',
        );
      }
      if (
        usuario.user.estado &&
        tieneRolAdmin(usuario) &&
        (await this.usuarioInternoRepository.countActiveAdmins(id)) === 0
      ) {
        throw new ResourceConflictError(
          'No se puede desactivar al último administrador activo',
        );
      }
    }

    // Desactivar revoca los refresh tokens (lo hace el repositorio).
    return this.usuarioInternoRepository.setStatus(id, estado);
  }
}
