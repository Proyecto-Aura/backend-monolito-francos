import { Injectable } from '@nestjs/common';
import { ListPersonasQueryDto } from '../../dto/persona-dtos/list-personas-query.dto';
import { PersonaEntity } from '../../../domain/entities/persona.entity';
import { TipoDocumento } from '../../../domain/enums/persons.enums';
import { PersonaRepository } from '../../../domain/repositories/persona.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';

@Injectable()
export class ListPersonasUseCase {
  constructor(private readonly personaRepository: PersonaRepository) {}

  execute(dto: ListPersonasQueryDto): Promise<PaginatedResult<PersonaEntity>> {
    return this.personaRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado: dto.estado,
      tipo_documento: dto.tipo_documento as TipoDocumento | undefined,
    });
  }
}
