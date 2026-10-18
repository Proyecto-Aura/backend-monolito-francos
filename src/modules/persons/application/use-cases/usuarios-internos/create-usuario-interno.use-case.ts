import { Injectable } from '@nestjs/common';
import { hashPassword } from '../../../../auth/application/utils/password.util';
import { ResourceConflictError } from '../../../domain/errors/persons-domain.errors';
import { PersonaRepository } from '../../../domain/repositories/persona.repository';
import { RolRepository } from '../../../domain/repositories/rol.repository';
import { UsuarioInterno } from '../../../domain/repositories/types/usuario-interno-repository.types';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { UsuarioInternoRepository } from '../../../domain/repositories/usuario-interno.repository';
import { CreateUsuarioInternoDto } from '../../dto/usuario-interno-dtos/create-usuario-interno.dto';
import { assertRolesAsignables } from './usuario-interno.rules';

@Injectable()
export class CreateUsuarioInternoUseCase {
  constructor(
    private readonly usuarioInternoRepository: UsuarioInternoRepository,
    private readonly personaRepository: PersonaRepository,
    private readonly userRepository: UserRepository,
    private readonly rolRepository: RolRepository,
  ) {}

  async execute(dto: CreateUsuarioInternoDto): Promise<UsuarioInterno> {
    if (await this.personaRepository.existsByDocument(dto.numero_documento)) {
      throw new ResourceConflictError(
        'Existe una persona con ese mismo número de documento',
      );
    }
    if (await this.userRepository.existsByEmail(dto.email)) {
      throw new ResourceConflictError('Existe un usuario con ese mismo email');
    }
    if (await this.userRepository.existsByUsername(dto.username)) {
      throw new ResourceConflictError(
        'Ya existe un usuario con ese nombre de usuario',
      );
    }

    await assertRolesAsignables(this.rolRepository, dto.rol_ids);

    return this.usuarioInternoRepository.create({
      persona: {
        nombres: dto.nombres,
        apellido_paterno: dto.apellido_paterno,
        apellido_materno: dto.apellido_materno,
        tipo_documento: dto.tipo_documento,
        numero_documento: dto.numero_documento,
      },
      user: {
        email: dto.email,
        username: dto.username,
        contrasena_hash: await hashPassword(dto.contrasena),
        estado: dto.estado ?? true,
        email_verificado: false,
        // El admin conoce la contraseña: el usuario debe cambiarla.
        debe_cambiar_contrasena: true,
      },
      rol_ids: dto.rol_ids,
    });
  }
}
