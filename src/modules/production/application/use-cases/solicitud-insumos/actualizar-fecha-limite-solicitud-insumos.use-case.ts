import { Injectable } from '@nestjs/common';
import { SolicitudInsumosEntity } from '../../../domain/entities';
import { EstadoSolicitudInsumos } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { SolicitudInsumosRepository } from '../../../domain/repositories/solicitud-insumos.repository';
import { ActualizarFechaLimiteSolicitudInsumosDto } from '../../dto/solicitud-insumos-dtos/actualizar-fecha-limite-solicitud-insumos.dto';

@Injectable()
export class ActualizarFechaLimiteSolicitudInsumosUseCase {
  constructor(
    private readonly solicitudInsumosRepository: SolicitudInsumosRepository,
  ) {}

  async execute(
    id: number,
    dto: ActualizarFechaLimiteSolicitudInsumosDto,
  ): Promise<SolicitudInsumosEntity> {
    const solicitud = await this.solicitudInsumosRepository.findById(id);
    if (!solicitud) {
      throw new ResourceNotFoundError('Solicitud de insumos no encontrada');
    }
    if (solicitud.estado !== EstadoSolicitudInsumos.PENDIENTE) {
      throw new ResourceConflictError(
        'La fecha límite solo se puede editar mientras la solicitud está pendiente',
      );
    }

    return this.solicitudInsumosRepository.updateFechaLimite(
      id,
      new Date(dto.fecha_limite),
    );
  }
}
