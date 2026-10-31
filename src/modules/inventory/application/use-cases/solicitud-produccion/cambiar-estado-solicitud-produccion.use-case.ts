import { Injectable } from '@nestjs/common';
import { SolicitudProduccionEntity } from '../../../domain/entities';
import { EstadoSolicitudProduccion } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
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

    // En el único estado donde conviven dos roles (pendiente), inventario y
    // admin solo pueden "cancelar" (rechazar); avanzar a en_proceso es cosa
    // de producción. Entregado solo lo mueve producción (ya viene desde
    // en_proceso, donde solo esa transición es válida).
    const esProduccion = roles.includes('produccion');
    const puedeRechazar =
      roles.includes('admin') || roles.includes('inventario') || esProduccion;

    if (nuevoEstado === EstadoSolicitudProduccion.RECHAZADO) {
      if (!puedeRechazar) {
        throw new ResourceConflictError(
          'No tenés permiso para rechazar esta solicitud',
        );
      }
    } else if (!esProduccion) {
      throw new ResourceConflictError(
        'Solo producción puede mover la solicitud a este estado',
      );
    }

    return this.solicitudProduccionRepository.updateEstado(id, nuevoEstado);
  }
}
