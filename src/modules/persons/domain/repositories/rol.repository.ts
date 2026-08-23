import { RolEntity } from '../entities/rol.entity';
import { PaginatedResult } from './types/pagination.types';
import {
  CreateRolParams,
  ListRolesParams,
  UpdateRolParams,
} from './types/rol-repository.types';

export abstract class RolRepository {
  abstract create(params: CreateRolParams): Promise<RolEntity>;

  abstract findById(id: number): Promise<RolEntity | null>;

  abstract findMany(
    params: ListRolesParams,
  ): Promise<PaginatedResult<RolEntity>>;

  abstract existsByName(nombre: string, excludeId?: number): Promise<boolean>;
  abstract findByName(nombre: string): Promise<RolEntity | null>;

  abstract update(id: number, params: UpdateRolParams): Promise<RolEntity>;

  abstract setStatus(id: number, estado: boolean): Promise<RolEntity>;
}
