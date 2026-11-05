import { Injectable } from '@nestjs/common';
import { SolicitudProduccionDetalleEntity } from '../../../domain/entities';
import { EstadoSolicitudProduccion } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { SolicitudProduccionDetalleRepository } from '../../../domain/repositories/solicitud-produccion-detalle.repository';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';
import { ActualizarDetalleLineaDto } from '../../dto/solicitud-produccion-detalle-dtos/actualizar-detalle-linea.dto';

@Injectable()
export class ActualizarDetalleLineaUseCase {
  constructor(
    private readonly solicitudProduccionDetalleRepository: SolicitudProduccionDetalleRepository,
    private readonly solicitudProduccionRepository: SolicitudProduccionRepository,
  ) {}

  async execute(
    id: number,
    dto: ActualizarDetalleLineaDto,
  ): Promise<SolicitudProduccionDetalleEntity> {
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

    return this.solicitudProduccionDetalleRepository.actualizarCantidad(
      id,
      dto.cantidad_solicitada,
    );
  }
}
