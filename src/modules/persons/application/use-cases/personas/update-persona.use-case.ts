import { Injectable } from '@nestjs/common';
import { UpdatePersonaDto } from '../../dto/persona-dtos/update-persona.dto';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { PersonaEntity } from '../../../domain/entities/persona.entity';
import { TipoDocumento } from '../../../domain/enums/persons.enums';
import { PersonaRepository } from '../../../domain/repositories/persona.repository';

@Injectable()
export class UpdatePersonaUseCase {
  constructor(private readonly personaRepository: PersonaRepository) {}

  async execute(id: string, dto: UpdatePersonaDto): Promise<PersonaEntity> {
    const persona = await this.personaRepository.findById(id);

    if (!persona) {
      throw new ResourceNotFoundError('Persona no encontrada');
    }

    if (
      dto.numero_documento &&
      dto.numero_documento !== persona.numero_documento &&
      (await this.personaRepository.existsByDocument(dto.numero_documento, id))
    ) {
      throw new ResourceConflictError(
        'Ya existe una persona con ese documento',
      );
    }

    return this.personaRepository.update(id, {
      nombres: dto.nombres,
      apellido_paterno: dto.apellido_paterno,
      apellido_materno: dto.apellido_materno,
      tipo_documento: dto.tipo_documento as TipoDocumento | undefined,
      numero_documento: dto.numero_documento,
      telefono: dto.telefono,
      fecha_nacimiento: dto.fecha_nacimiento
        ? new Date(dto.fecha_nacimiento)
        : undefined,
      direccion: dto.direccion,
    });
  }
}
