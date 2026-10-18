import { Injectable } from '@nestjs/common';
import { hashPassword } from '../../../../auth/application/utils/password.util';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { UsuarioInterno } from '../../../domain/repositories/types/usuario-interno-repository.types';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { UsuarioInternoRepository } from '../../../domain/repositories/usuario-interno.repository';
import { UpdateUsuarioInternoDto } from '../../dto/usuario-interno-dtos/update-usuario-interno.dto';

@Injectable()
export class UpdateUsuarioInternoUseCase {
  constructor(
    private readonly usuarioInternoRepository: UsuarioInternoRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    id: string,
    dto: UpdateUsuarioInternoDto,
  ): Promise<UsuarioInterno> {
    const usuario = await this.usuarioInternoRepository.findById(id);
    if (!usuario) {
      throw new ResourceNotFoundError('Usuario interno no encontrado');
    }

    if (
      dto.username &&
      dto.username !== usuario.user.username &&
      (await this.userRepository.existsByUsername(dto.username, id))
    ) {
      throw new ResourceConflictError(
        'Ya existe un usuario con ese nombre de usuario',
      );
    }

    // Cambiar la contraseña revoca los refresh tokens (lo hace el repositorio).
    return this.usuarioInternoRepository.update(id, {
      username: dto.username,
      nombres: dto.nombres,
      apellido_paterno: dto.apellido_paterno,
      apellido_materno: dto.apellido_materno,
      contrasena_hash:
        dto.contrasena === undefined
          ? undefined
          : await hashPassword(dto.contrasena),
    });
  }
}
