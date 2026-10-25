import { Injectable } from '@nestjs/common';
import { ResourceConflictError } from '../../../domain/errors/persons-domain.errors';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { UpdatePerfilDto } from '../../dto/perfil-dtos/update-perfil.dto';
import { GetPerfilUseCase, PerfilCliente } from './get-perfil.use-case';

// HU-B-015 (RF-B43): el cliente edita su nombre, email y teléfono. El email se
// cambia directo; verificarlo antes de aplicarlo es la HU-B-016.
@Injectable()
export class UpdatePerfilUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly getPerfil: GetPerfilUseCase,
  ) {}

  async execute(userId: string, dto: UpdatePerfilDto): Promise<PerfilCliente> {
    const { user } = await this.getPerfil.execute(userId);

    if (
      dto.email !== undefined &&
      dto.email !== user.email &&
      (await this.userRepository.existsByEmail(dto.email, user.id))
    ) {
      throw new ResourceConflictError(
        'Ese correo ya está registrado en otra cuenta',
      );
    }

    await this.userRepository.updateWithPersona(
      user.id,
      { email: dto.email },
      { nombres: dto.nombres, telefono: dto.telefono },
    );
    return this.getPerfil.execute(userId);
  }
}
