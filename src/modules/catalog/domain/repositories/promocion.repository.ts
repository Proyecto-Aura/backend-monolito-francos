import { PromocionEntity } from '../entities';
import { PaginatedResult } from './types/pagination.types';
import {
  CreatePromocionParams,
  ListPromocionesParams,
} from './types/promocion-repository.types';

export abstract class PromocionRepository {
  abstract create(params: CreatePromocionParams): Promise<PromocionEntity>;
  abstract findById(id: number): Promise<PromocionEntity | null>;
  abstract findMany(
    params: ListPromocionesParams,
  ): Promise<PaginatedResult<PromocionEntity>>;
  abstract existsByName(nombre: string, excludeId?: number): Promise<boolean>;
  // se podria agregar buscar productos por tipo
  abstract update(
    id: number,
    params: CreatePromocionParams,
  ): Promise<PromocionEntity>;
  abstract setStatus(id: number, estado: boolean): Promise<PromocionEntity>;
}
