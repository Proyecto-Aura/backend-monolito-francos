import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../../persons/domain/repositories/user.repository';
import { PersonaRepository } from '../../../persons/domain/repositories/persona.repository';
import { ResourceNotFoundError } from '../../domain/errors/auth-domain.errors';

export interface MeResult {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  email: string;
  username: string;
  roles: string[];
}

@Injectable()
export class GetMeUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly personaRepository: PersonaRepository,
  ) {}

  async execute(userId: string, roles: string[]): Promise<MeResult> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ResourceNotFoundError('Usuario no encontrado');
    }

    const persona = await this.personaRepository.findById(user.persona_id);

    if (!persona) {
      throw new ResourceNotFoundError('Persona no encontrada');
    }

    return {
      nombres: persona.nombres,
      apellido_paterno: persona.apellido_paterno,
      apellido_materno: persona.apellido_materno,
      email: user.email,
      username: user.username,
      roles,
    };
  }
}
