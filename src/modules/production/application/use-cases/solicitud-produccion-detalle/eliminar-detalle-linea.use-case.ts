import { Injectable } from '@nestjs/common';
import { EstadoSolicitudProduccion } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { SolicitudProduccionDetalleRepository } from '../../../domain/repositories/solicitud-produccion-detalle.repository';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';

@Injectable()
export class EliminarDetalleLineaUseCase {
  constructor(
    private readonly solicitudProduccionDetalleRepository: SolicitudProduccionDetalleRepository,
    private readonly solicitudProduccionRepository: SolicitudProduccionRepository,
  ) {}

  async execute(id: number): Promise<void> {
    const detalle =
      await this.solicitudProduccionDetalleRepository.findById(id);
    if (!detalle) {
      throw new ResourceNotFoundError('Línea de detalle no encontrada');
    }

    const solicitud = await this.solicitudProduccionRepository.findById(
      detalle.solicitud_produccion_id,
    );
    if (
      !solicitud ||
      solicitud.estado !== EstadoSolicitudProduccion.PENDIENTE
    ) {
      throw new ResourceConflictError(
        'El detalle solo se puede editar mientras la solicitud está pendiente',
      );
    }

    const lineasRestantes =
      await this.solicitudProduccionDetalleRepository.findBySolicitudId(
        detalle.solicitud_produccion_id,
      );
    if (lineasRestantes.length <= 1) {
      throw new ResourceConflictError(
        'La solicitud debe tener al menos una línea de detalle',
      );
    }

    await this.solicitudProduccionDetalleRepository.eliminar(id);
  }
}
