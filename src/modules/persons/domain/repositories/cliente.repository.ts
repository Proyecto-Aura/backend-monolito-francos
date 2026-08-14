import { ClienteEntity } from '../entities/cliente.entity';
import { PaginatedResult } from './types/pagination.types';
import {
  CreateClienteParams,
  ListClientesParams,
  UpdateClienteParams,
} from './types/cliente-repository.types';

export abstract class ClienteRepository {
  abstract create(params: CreateClienteParams): Promise<ClienteEntity>;
  abstract findById(id: string): Promise<ClienteEntity | null>;
  abstract findMany(
    params: ListClientesParams,
  ): Promise<PaginatedResult<ClienteEntity>>;
  abstract existsByPersonaId(
    personaId: string,
    excludeId?: string,
  ): Promise<boolean>;
  abstract update(
    id: string,
    params: UpdateClienteParams,
  ): Promise<ClienteEntity>;
  abstract setStatus(id: string, estado: boolean): Promise<ClienteEntity>;
}
