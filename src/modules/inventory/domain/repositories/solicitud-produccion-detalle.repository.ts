import { SolicitudProduccionDetalleEntity } from '../entities';
import { AgregarDetalleLineaParams } from './types/solicitud-produccion-detalle-repository.types';

export abstract class SolicitudProduccionDetalleRepository {
  abstract findById(
    id: number,
  ): Promise<SolicitudProduccionDetalleEntity | null>;
  abstract findBySolicitudId(
    solicitud_produccion_id: number,
  ): Promise<SolicitudProduccionDetalleEntity[]>;
  abstract existsByProductoEnSolicitud(
    solicitud_produccion_id: number,
    producto_terminado_id: number,
  ): Promise<boolean>;
  abstract agregar(
    params: AgregarDetalleLineaParams,
  ): Promise<SolicitudProduccionDetalleEntity>;
  abstract actualizarCantidad(
    id: number,
    cantidad_solicitada: number,
  ): Promise<SolicitudProduccionDetalleEntity>;
  abstract eliminar(id: number): Promise<void>;
}
