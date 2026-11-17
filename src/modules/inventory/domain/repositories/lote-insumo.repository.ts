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
  // Lotes consumibles de un insumo (activo=true, estado=activo,
  // cantidad_actual>0), ordenados FEFO: vencimiento más próximo primero.
  // Sin paginar: el use-case de salida necesita la lista completa para
  // repartir la cantidad pedida entre los lotes que haga falta.
  abstract findDisponiblesParaSalida(
    insumo_id: number,
  ): Promise<LoteInsumoEntity[]>;
}
