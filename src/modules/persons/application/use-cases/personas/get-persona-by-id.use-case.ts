import { Injectable } from '@nestjs/common';
import { PersonaEntity } from '../../../domain/entities/persona.entity';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { PersonaRepository } from '../../../domain/repositories/persona.repository';

@Injectable()
export class GetPersonaByIdUseCase {
  constructor(private readonly personaRepository: PersonaRepository) {}

  async execute(id: string): Promise<PersonaEntity> {
    const persona = await this.personaRepository.findById(id);

    if (!persona) {
      throw new ResourceNotFoundError('Persona no encontrada');
    }

    return persona;
  }
}
