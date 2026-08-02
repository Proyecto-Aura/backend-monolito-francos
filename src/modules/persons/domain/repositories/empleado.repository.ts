import { EmpleadoEntity } from '../entities/empleado.entity';
import { PaginatedResult } from './types/pagination.types';
import {
  CreateEmpleadoParams,
  ListEmpleadosParams,
  UpdateEmpleadoParams,
} from './types/empleado-repository.types';

export abstract class EmpleadoRepository {
  abstract create(params: CreateEmpleadoParams): Promise<EmpleadoEntity>;
  abstract findById(id: string): Promise<EmpleadoEntity | null>;
  abstract findMany(
    params: ListEmpleadosParams,
  ): Promise<PaginatedResult<EmpleadoEntity>>;
  abstract existsByPersonaId(
    personaId: string,
    excludeId?: string,
  ): Promise<boolean>;
  abstract update(
    id: string,
    params: UpdateEmpleadoParams,
  ): Promise<EmpleadoEntity>;
  abstract setStatus(id: string, estado: boolean): Promise<EmpleadoEntity>;
}
