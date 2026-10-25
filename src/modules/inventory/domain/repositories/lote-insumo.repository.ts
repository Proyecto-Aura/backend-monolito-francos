import { LoteInsumoEntity } from '../entities';
import {
  CreateLoteInsumoParams,
  ListLoteInsumosParams,
} from './types/lote-insumo-repository.types';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';

export abstract class LoteInsumoRepository {
  abstract create(params: CreateLoteInsumoParams): Promise<LoteInsumoEntity>;
  abstract findById(id: number): Promise<LoteInsumoEntity | null>;
  abstract findMany(
    params: ListLoteInsumosParams,
  ): Promise<PaginatedResult<LoteInsumoEntity>>;
  abstract existsByCodigoLote(codigo_lote: string): Promise<boolean>;
  abstract setActivo(id: number, activo: boolean): Promise<LoteInsumoEntity>;
}
