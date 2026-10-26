import { MovimientoProductoTerminadoEntity } from '../entities';
import {
  CreateMovimientoProductoTerminadoParams,
  ListMovimientoProductoTerminadoParams,
} from './types/movimiento-producto-terminado-repository.types';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';

// Sin update ni delete: es un historial inmutable, solo se agrega.
export abstract class MovimientoProductoTerminadoRepository {
  abstract create(
    params: CreateMovimientoProductoTerminadoParams,
  ): Promise<MovimientoProductoTerminadoEntity>;
  // Inserta varios movimientos en una sola transacción (reparto FEFO entre
  // varios lotes, o batch de filas): o se crean todos, o no se crea ninguno.
  abstract createMany(
    params: CreateMovimientoProductoTerminadoParams[],
  ): Promise<MovimientoProductoTerminadoEntity[]>;
  abstract findById(
    id: number,
  ): Promise<MovimientoProductoTerminadoEntity | null>;
  abstract findMany(
    params: ListMovimientoProductoTerminadoParams,
  ): Promise<PaginatedResult<MovimientoProductoTerminadoEntity>>;
}
