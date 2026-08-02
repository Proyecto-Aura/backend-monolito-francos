import { RutaEntity } from '../entities/ruta.entity';
import { PaginatedResult } from './types/pagination.types';
import {
  CreateRutaParams,
  ListRutasParams,
  MoveRutaParams,
  UpdateRutaParams,
} from './types/ruta-repository.types';

export abstract class RutaRepository {
  abstract create(params: CreateRutaParams): Promise<RutaEntity>;

  abstract findById(id: number): Promise<RutaEntity | null>;

  abstract findMany(
    params: ListRutasParams,
  ): Promise<PaginatedResult<RutaEntity>>;

  abstract findAllByStatus(estado: boolean): Promise<RutaEntity[]>;

  abstract existsByName(nombre: string, excludeId?: number): Promise<boolean>;

  abstract update(id: number, params: UpdateRutaParams): Promise<RutaEntity>;

  abstract move(id: number, params: MoveRutaParams): Promise<RutaEntity>;

  abstract hasActiveChildren(id: number): Promise<boolean>;

  abstract setStatus(id: number, estado: boolean): Promise<RutaEntity>;
}
