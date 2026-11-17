import { Injectable } from '@nestjs/common';
import { SolicitudInsumosDetalleEntity } from '../../../domain/entities';
import { EstadoSolicitudInsumos } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { SolicitudInsumosDetalleRepository } from '../../../domain/repositories/solicitud-insumos-detalle.repository';
import { SolicitudInsumosRepository } from '../../../domain/repositories/solicitud-insumos.repository';
import { ActualizarDetalleLineaInsumoDto } from '../../dto/solicitud-insumos-detalle-dtos/actualizar-detalle-linea.dto';

@Injectable()
export class ActualizarDetalleLineaInsumoUseCase {
  constructor(
    private readonly solicitudInsumosDetalleRepository: SolicitudInsumosDetalleRepository,
    private readonly solicitudInsumosRepository: SolicitudInsumosRepository,
  ) {}

  async execute(
    id: number,
    dto: ActualizarDetalleLineaInsumoDto,
  ): Promise<SolicitudInsumosDetalleEntity> {
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

    return this.solicitudInsumosDetalleRepository.actualizarCantidad(
      id,
      dto.cantidad_solicitada,
    );
  }
}
