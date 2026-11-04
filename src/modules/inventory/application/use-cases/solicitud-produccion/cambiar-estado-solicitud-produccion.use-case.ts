import { Injectable } from '@nestjs/common';
import { SolicitudProduccionEntity } from '../../../domain/entities';
import { EstadoSolicitudProduccion } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { LoteProductoTerminadoRepository } from '../../../domain/repositories/lote-producto-terminado.repository';
import { SolicitudProduccionDetalleRepository } from '../../../domain/repositories/solicitud-produccion-detalle.repository';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';

// pendiente -> en_proceso -> entregado. rechazado solo se alcanza desde
// pendiente (ni inventario ni produccion rechazan algo ya en marcha).
const TRANSICIONES_VALIDAS: Record<
  EstadoSolicitudProduccion,
  EstadoSolicitudProduccion[]
> = {
  [EstadoSolicitudProduccion.PENDIENTE]: [
    EstadoSolicitudProduccion.EN_PROCESO,
    EstadoSolicitudProduccion.RECHAZADO,
  ],
  [EstadoSolicitudProduccion.EN_PROCESO]: [EstadoSolicitudProduccion.ENTREGADO],
  [EstadoSolicitudProduccion.ENTREGADO]: [],
  [EstadoSolicitudProduccion.RECHAZADO]: [],
};

@Injectable()
export class CambiarEstadoSolicitudProduccionUseCase {
  constructor(
    private readonly solicitudProduccionRepository: SolicitudProduccionRepository,
    private readonly solicitudProduccionDetalleRepository: SolicitudProduccionDetalleRepository,
    private readonly loteProductoTerminadoRepository: LoteProductoTerminadoRepository,
  ) {}

  async execute(
    id: number,
    nuevoEstado: EstadoSolicitudProduccion,
    roles: string[],
  ): Promise<SolicitudProduccionEntity> {
    const solicitud = await this.solicitudProduccionRepository.findById(id);
    if (!solicitud) {
      throw new ResourceNotFoundError('Solicitud de producción no encontrada');
    }

    const transicionesPermitidas = TRANSICIONES_VALIDAS[solicitud.estado];
    if (!transicionesPermitidas.includes(nuevoEstado)) {
      throw new ResourceConflictError(
        `No se puede pasar de "${solicitud.estado}" a "${nuevoEstado}"`,
      );
    }

    // Inventario solo puede "cancelar" (rechazar) mientras está pendiente;
    // avanzar a en_proceso/entregado es cosa de producción. Admin tiene
    // acceso total al sistema, así que puede hacer lo mismo que producción
    // además de rechazar.
    const esAdmin = roles.includes('admin');
    const esProduccion = roles.includes('produccion');
    const puedeAvanzar = esProduccion || esAdmin;
    const puedeRechazar =
      esAdmin || roles.includes('inventario') || esProduccion;

    if (nuevoEstado === EstadoSolicitudProduccion.RECHAZADO) {
      if (!puedeRechazar) {
        throw new ResourceConflictError(
          'No tenés permiso para rechazar esta solicitud',
        );
      }
    } else if (!puedeAvanzar) {
      throw new ResourceConflictError(
        'Solo producción (o un admin) puede mover la solicitud a este estado',
      );
    }

    // No se puede entregar si todavía falta registrar el lote de algún
    // producto de la solicitud (OFT0-262).
    if (nuevoEstado === EstadoSolicitudProduccion.ENTREGADO) {
      const detalle =
        await this.solicitudProduccionDetalleRepository.findBySolicitudId(id);
      const productosConLote = new Set(
        await this.loteProductoTerminadoRepository.findProductoTerminadoIdsConLotePorSolicitud(
          id,
        ),
      );
      const faltaAlguno = detalle.some(
        (linea) => !productosConLote.has(linea.producto_terminado_id),
      );
      if (faltaAlguno) {
        throw new ResourceConflictError(
          'Faltan lotes por registrar para completar esta solicitud',
        );
      }
    }

    return this.solicitudProduccionRepository.updateEstado(id, nuevoEstado);
  }
}
