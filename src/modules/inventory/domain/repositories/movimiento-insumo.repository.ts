import { MovimientoInsumoEntity } from '../entities';
import {
  CreateMovimientoInsumoParams,
  ListMovimientoInsumoParams,
} from './types/movimiento-insumo-repository.types';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';

// Sin update ni delete: es un historial inmutable, solo se agrega.
export abstract class MovimientoInsumoRepository {
  abstract create(
    params: CreateMovimientoInsumoParams,
  ): Promise<MovimientoInsumoEntity>;
  // Inserta varios movimientos en una sola transacción (reparto FEFO entre
  // varios lotes): o se crean todos, o no se crea ninguno.
  abstract createMany(
    params: CreateMovimientoInsumoParams[],
  ): Promise<MovimientoInsumoEntity[]>;
  abstract findById(id: number): Promise<MovimientoInsumoEntity | null>;
  abstract findMany(
    params: ListMovimientoInsumoParams,
  ): Promise<PaginatedResult<MovimientoInsumoEntity>>;
}
