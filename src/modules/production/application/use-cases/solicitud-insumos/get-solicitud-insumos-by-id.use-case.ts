import { Injectable } from '@nestjs/common';
import {
  SolicitudInsumosDetalleEntity,
  SolicitudInsumosEntity,
} from '../../../domain/entities';
import { ResourceNotFoundError } from '../../../../catalog/domain/errors/catalog-domain.errors';
import { SolicitudInsumosDetalleRepository } from '../../../domain/repositories/solicitud-insumos-detalle.repository';
import { SolicitudInsumosRepository } from '../../../domain/repositories/solicitud-insumos.repository';

export interface SolicitudInsumosConDetalle {
  solicitud: SolicitudInsumosEntity;
  detalle: SolicitudInsumosDetalleEntity[];
}

@Injectable()
export class GetSolicitudInsumosByIdUseCase {
  constructor(
    private readonly solicitudInsumosRepository: SolicitudInsumosRepository,
    private readonly solicitudInsumosDetalleRepository: SolicitudInsumosDetalleRepository,
  ) {}

  async execute(id: number): Promise<SolicitudInsumosConDetalle> {
    const solicitud = await this.solicitudInsumosRepository.findById(id);
    if (!solicitud) {
      throw new ResourceNotFoundError('Solicitud de insumos no encontrada');
    }

    const detalle =
      await this.solicitudInsumosDetalleRepository.findBySolicitudId(id);

    return { solicitud, detalle };
  }
}
