import { SerieComprobanteEntity } from '../entities/serie-comprobante.entity';
import { TipoComprobante } from '../enums/sales.enums';
import { PaginatedResult } from './types/pagination.types';
import {
  CorrelativoReservado,
  CreateSerieComprobanteParams,
  ListSeriesComprobanteParams,
  UpdateSerieComprobanteParams,
} from './types/serie-comprobante-repository.types';

// Las violaciones de unicidad que detecta la base de datos (código repetido o
// segunda serie activa del mismo tipo) llegan como ResourceConflictError.
export abstract class SerieComprobanteRepository {
  abstract create(
    params: CreateSerieComprobanteParams,
  ): Promise<SerieComprobanteEntity>;

  abstract findById(id: number): Promise<SerieComprobanteEntity | null>;

  abstract findMany(
    params: ListSeriesComprobanteParams,
  ): Promise<PaginatedResult<SerieComprobanteEntity>>;

  abstract findActivas(): Promise<SerieComprobanteEntity[]>;

  abstract findActivaByTipo(
    tipo: TipoComprobante,
  ): Promise<SerieComprobanteEntity | null>;

  // ¿Hay alguna serie del tipo, activa o no?
  abstract existsByTipo(tipo: TipoComprobante): Promise<boolean>;

  abstract existsBySerie(serie: string, excludeId?: number): Promise<boolean>;

  abstract existsActivaByTipo(
    tipo: TipoComprobante,
    excludeId?: number,
  ): Promise<boolean>;

  // Con `expectedCorrelativoActual`, solo actualiza si el correlativo no cambió
  // desde la lectura; si cambió (hubo una reserva en medio), responde 409.
  abstract update(
    id: number,
    params: UpdateSerieComprobanteParams,
    expectedCorrelativoActual?: number,
  ): Promise<SerieComprobanteEntity>;

  abstract setStatus(
    id: number,
    estado: boolean,
  ): Promise<SerieComprobanteEntity>;

  // Avanza en 1 el correlativo de la serie activa del tipo con un único UPDATE
  // atómico. Devuelve null si no hay serie activa con números disponibles.
  abstract reservarSiguiente(
    tipo: TipoComprobante,
  ): Promise<CorrelativoReservado | null>;
}
