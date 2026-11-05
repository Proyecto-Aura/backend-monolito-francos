import { SolicitudInsumosEntity } from '../entities';
import { EstadoSolicitudInsumos } from '../enums';
import {
  CreateSolicitudInsumosParams,
  IndicadoresSolicitudInsumos,
  ListSolicitudInsumosParams,
} from './types/solicitud-insumos-repository.types';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';

export abstract class SolicitudInsumosRepository {
  // Crea la cabecera y las lineas del detalle en una sola transaccion.
  abstract create(
    params: CreateSolicitudInsumosParams,
  ): Promise<SolicitudInsumosEntity>;
  abstract findById(id: number): Promise<SolicitudInsumosEntity | null>;
  abstract findMany(
    params: ListSolicitudInsumosParams,
  ): Promise<PaginatedResult<SolicitudInsumosEntity>>;
  abstract existsByCodigo(codigo_solicitud: string): Promise<boolean>;
  abstract updateEstado(
    id: number,
    estado: EstadoSolicitudInsumos,
  ): Promise<SolicitudInsumosEntity>;
  abstract updateFechaLimite(
    id: number,
    fecha_limite: Date,
  ): Promise<SolicitudInsumosEntity>;
  abstract getIndicadores(): Promise<IndicadoresSolicitudInsumos>;
}
