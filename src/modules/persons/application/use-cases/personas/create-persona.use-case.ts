import { Injectable } from '@nestjs/common';
import { CreatePersonaDto } from '../../dto/persona-dtos/create-persona.dto';
import { ResourceConflictError } from '../../../domain/errors/persons-domain.errors';
import { PersonaEntity } from '../../../domain/entities/persona.entity';
import { TipoDocumento } from '../../../domain/enums/persons.enums';
import { PersonaRepository } from '../../../domain/repositories/persona.repository';

@Injectable()
export class CreatePersonaUseCase {
  constructor(private readonly personaRepository: PersonaRepository) {}

  async execute(dto: CreatePersonaDto): Promise<PersonaEntity> {
    const exists = await this.personaRepository.existsByDocument(
      dto.numero_documento,
    );

    if (exists) {
      throw new ResourceConflictError(
        'Ya existe una persona con ese documento',
      );
    }

    return this.personaRepository.create({
      nombres: dto.nombres,
      apellido_paterno: dto.apellido_paterno,
      apellido_materno: dto.apellido_materno,
      tipo_documento: dto.tipo_documento as TipoDocumento,
      numero_documento: dto.numero_documento,
      telefono: dto.telefono ?? null,
      fecha_nacimiento: dto.fecha_nacimiento
        ? new Date(dto.fecha_nacimiento)
        : null,
      direccion: dto.direccion ?? null,
      estado: dto.estado ?? true,
    });
  }
}
