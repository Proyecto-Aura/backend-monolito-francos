import { SolicitudProduccionEntity } from '../entities';
import { EstadoSolicitudProduccion } from '../enums';
import {
  CreateSolicitudProduccionParams,
  IndicadoresSolicitudProduccion,
  ListSolicitudProduccionParams,
} from './types/solicitud-produccion-repository.types';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';

export abstract class SolicitudProduccionRepository {
  // Crea la cabecera y las lineas del detalle en una sola transaccion.
  abstract create(
    params: CreateSolicitudProduccionParams,
  ): Promise<SolicitudProduccionEntity>;
  abstract findById(id: number): Promise<SolicitudProduccionEntity | null>;
  abstract findMany(
    params: ListSolicitudProduccionParams,
  ): Promise<PaginatedResult<SolicitudProduccionEntity>>;
  abstract existsByCodigo(codigo: string): Promise<boolean>;
  abstract updateEstado(
    id: number,
    estado: EstadoSolicitudProduccion,
  ): Promise<SolicitudProduccionEntity>;
  abstract updateFechaLimite(
    id: number,
    fecha_limite: Date,
  ): Promise<SolicitudProduccionEntity>;
  abstract getIndicadores(): Promise<IndicadoresSolicitudProduccion>;
}
