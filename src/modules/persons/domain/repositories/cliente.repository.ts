import { ClienteEntity } from '../entities/cliente.entity';
import { PersonaEntity } from '../entities/persona.entity';
import { PaginatedResult } from './types/pagination.types';
import {
  ListClientesParams,
  UpdateClienteConPersonaParams,
} from './types/cliente-repository.types';

export abstract class ClienteRepository {
  abstract findById(id: string): Promise<ClienteEntity | null>;
  abstract findMany(params: ListClientesParams): Promise<PaginatedResult<ClienteEntity>>;
  abstract existsByPersonaId(personaId: string, excludeId?: string): Promise<boolean>;
  abstract updateWithPersona(clienteId: string, params: UpdateClienteConPersonaParams): Promise<{ cliente: ClienteEntity; persona: PersonaEntity }>;
  abstract setStatus(id: string, estado: boolean): Promise<ClienteEntity>;
}
