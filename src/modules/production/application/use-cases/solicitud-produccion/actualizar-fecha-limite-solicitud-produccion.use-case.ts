import { Injectable } from '@nestjs/common';
import { SolicitudProduccionEntity } from '../../../domain/entities';
import { EstadoSolicitudProduccion } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';
import { ActualizarFechaLimiteSolicitudProduccionDto } from '../../dto/solicitud-produccion-dtos/actualizar-fecha-limite-solicitud-produccion.dto';

@Injectable()
export class ActualizarFechaLimiteSolicitudProduccionUseCase {
  constructor(
    private readonly solicitudProduccionRepository: SolicitudProduccionRepository,
  ) {}

  async execute(
    id: number,
    dto: ActualizarFechaLimiteSolicitudProduccionDto,
  ): Promise<SolicitudProduccionEntity> {
    const solicitud = await this.solicitudProduccionRepository.findById(id);
    if (!solicitud) {
      throw new ResourceNotFoundError('Solicitud de producción no encontrada');
    }
    if (solicitud.estado !== EstadoSolicitudProduccion.PENDIENTE) {
      throw new ResourceConflictError(
        'La fecha límite solo se puede editar mientras la solicitud está pendiente',
      );
    }

    return this.solicitudProduccionRepository.updateFechaLimite(
      id,
      new Date(dto.fecha_limite),
    );
  }
}
