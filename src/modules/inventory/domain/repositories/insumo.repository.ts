import { InsumoEntity } from '../entities';
import {
  CreateInsumoParams,
  IndicadoresInsumo,
  ListInsumosParams,
  UpdateInsumoParams,
} from './types/insumo-repository.types';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';

export abstract class InsumoRepository {
  abstract create(params: CreateInsumoParams): Promise<InsumoEntity>;
  abstract findById(id: number): Promise<InsumoEntity | null>;
  abstract findMany(
    params: ListInsumosParams,
  ): Promise<PaginatedResult<InsumoEntity>>;
  abstract update(
    id: number,
    params: UpdateInsumoParams,
  ): Promise<InsumoEntity>;
  abstract setStatus(id: number, estado: boolean): Promise<InsumoEntity>;
  abstract getIndicadores(): Promise<IndicadoresInsumo>;
}
