import { Injectable } from '@nestjs/common';
import { EstadoSolicitudInsumos } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { SolicitudInsumosDetalleRepository } from '../../../domain/repositories/solicitud-insumos-detalle.repository';
import { SolicitudInsumosRepository } from '../../../domain/repositories/solicitud-insumos.repository';

@Injectable()
export class EliminarDetalleLineaInsumoUseCase {
  constructor(
    private readonly solicitudInsumosDetalleRepository: SolicitudInsumosDetalleRepository,
    private readonly solicitudInsumosRepository: SolicitudInsumosRepository,
  ) {}

  async execute(id: number): Promise<void> {
    const detalle = await this.solicitudInsumosDetalleRepository.findById(id);
    if (!detalle) {
      throw new ResourceNotFoundError('Línea de detalle no encontrada');
    }

    const solicitud = await this.solicitudInsumosRepository.findById(
      detalle.solicitud_insumos_id,
    );
    if (!solicitud || solicitud.estado !== EstadoSolicitudInsumos.PENDIENTE) {
      throw new ResourceConflictError(
        'El detalle solo se puede editar mientras la solicitud está pendiente',
      );
    }

    const lineasRestantes =
      await this.solicitudInsumosDetalleRepository.findBySolicitudId(
        detalle.solicitud_insumos_id,
      );
    if (lineasRestantes.length <= 1) {
      throw new ResourceConflictError(
        'La solicitud debe tener al menos una línea de detalle',
      );
    }

    await this.solicitudInsumosDetalleRepository.eliminar(id);
  }
}
