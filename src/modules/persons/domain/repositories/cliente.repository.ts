import { ClienteEntity } from '../entities/cliente.entity';
import { PaginatedResult } from './types/pagination.types';
import {
  ClienteConPersona,
  ListClientesParams,
  UpdateClienteConPersonaParams,
} from './types/cliente-repository.types';

export abstract class ClienteRepository {
  // Solo el cliente: sirve para comprobar que existe antes de editarlo o cambiar su estado.
  abstract findById(id: string): Promise<ClienteEntity | null>;
  abstract findByIdConPersona(id: string): Promise<ClienteConPersona | null>;
  abstract findByPersonaId(personaId: string): Promise<ClienteEntity | null>;
  abstract findMany(
    params: ListClientesParams,
  ): Promise<PaginatedResult<ClienteConPersona>>;
  abstract findManyConPersona(
    params: ListClientesParams,
  ): Promise<PaginatedResult<ClienteConPersona>>;
  abstract existsByPersonaId(
    personaId: string,
    excludeId?: string,
  ): Promise<boolean>;
  abstract updateWithPersona(
    clienteId: string,
    params: UpdateClienteConPersonaParams,
  ): Promise<ClienteConPersona>;
  abstract setStatus(id: string, estado: boolean): Promise<ClienteConPersona>;
}
