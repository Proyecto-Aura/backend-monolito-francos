import { PromocionEntity } from '../entities';
import { PaginatedResult } from './types/pagination.types';
import {
  CreatePromocionParams,
  ExistsPromocionOverlapParams,
  ListPromocionesParams,
  UpdatePromocionParams,
} from './types/promocion-repository.types';

export abstract class PromocionRepository {
  abstract create(params: CreatePromocionParams): Promise<PromocionEntity>;
  abstract findById(id: number): Promise<PromocionEntity | null>;
  abstract findMany(
    params: ListPromocionesParams,
  ): Promise<PaginatedResult<PromocionEntity>>;
  abstract existsByName(nombre: string, excludeId?: number): Promise<boolean>;
  // Una presentación no puede tener dos promociones activas con fechas que se cruzan.
  abstract existsOverlap(
    params: ExistsPromocionOverlapParams,
  ): Promise<boolean>;
  abstract update(
    id: number,
    params: UpdatePromocionParams,
  ): Promise<PromocionEntity>;
  abstract setStatus(id: number, estado: boolean): Promise<PromocionEntity>;
}
