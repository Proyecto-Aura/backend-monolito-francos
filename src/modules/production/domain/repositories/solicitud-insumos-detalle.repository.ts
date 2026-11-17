import { SolicitudInsumosDetalleEntity } from '../entities';
import { AgregarDetalleLineaInsumoParams } from './types/solicitud-insumos-detalle-repository.types';

export abstract class SolicitudInsumosDetalleRepository {
  abstract findById(id: number): Promise<SolicitudInsumosDetalleEntity | null>;
  abstract findBySolicitudId(
    solicitud_insumos_id: number,
  ): Promise<SolicitudInsumosDetalleEntity[]>;
  abstract existsByInsumoEnSolicitud(
    solicitud_insumos_id: number,
    insumo_id: number,
  ): Promise<boolean>;
  abstract agregar(
    params: AgregarDetalleLineaInsumoParams,
  ): Promise<SolicitudInsumosDetalleEntity>;
  abstract actualizarCantidad(
    id: number,
    cantidad_solicitada: number,
  ): Promise<SolicitudInsumosDetalleEntity>;
  abstract eliminar(id: number): Promise<void>;
}
