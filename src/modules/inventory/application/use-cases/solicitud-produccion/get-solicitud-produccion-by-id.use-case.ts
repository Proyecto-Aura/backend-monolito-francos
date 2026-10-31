import { Injectable } from '@nestjs/common';
import {
  SolicitudProduccionDetalleEntity,
  SolicitudProduccionEntity,
} from '../../../domain/entities';
import { ResourceNotFoundError } from '../../../../catalog/domain/errors/catalog-domain.errors';
import { SolicitudProduccionDetalleRepository } from '../../../domain/repositories/solicitud-produccion-detalle.repository';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';

export interface SolicitudProduccionConDetalle {
  solicitud: SolicitudProduccionEntity;
  detalle: SolicitudProduccionDetalleEntity[];
}

@Injectable()
export class GetSolicitudProduccionByIdUseCase {
  constructor(
    private readonly solicitudProduccionRepository: SolicitudProduccionRepository,
    private readonly solicitudProduccionDetalleRepository: SolicitudProduccionDetalleRepository,
  ) {}

  async execute(id: number): Promise<SolicitudProduccionConDetalle> {
    const solicitud = await this.solicitudProduccionRepository.findById(id);
    if (!solicitud) {
      throw new ResourceNotFoundError('Solicitud de producción no encontrada');
    }

    const detalle =
      await this.solicitudProduccionDetalleRepository.findBySolicitudId(id);

    return { solicitud, detalle };
  }
}
