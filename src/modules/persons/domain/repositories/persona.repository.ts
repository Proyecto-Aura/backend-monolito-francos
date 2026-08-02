import { PersonaEntity } from '../entities/persona.entity';
import { PaginatedResult } from './types/pagination.types';
import {
  CreatePersonaParams,
  ListPersonasParams,
  UpdatePersonaParams,
} from './types/persona-repository.types';

export abstract class PersonaRepository {
  abstract create(params: CreatePersonaParams): Promise<PersonaEntity>;

  abstract findById(id: string): Promise<PersonaEntity | null>;

  abstract findMany(
    params: ListPersonasParams,
  ): Promise<PaginatedResult<PersonaEntity>>;

  abstract existsByDocument(
    numeroDocumento: string,
    excludeId?: string,
  ): Promise<boolean>;

  abstract update(
    id: string,
    params: UpdatePersonaParams,
  ): Promise<PersonaEntity>;

  abstract setStatus(id: string, estado: boolean): Promise<PersonaEntity>;
}
