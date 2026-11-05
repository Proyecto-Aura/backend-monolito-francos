import { Injectable } from '@nestjs/common';
import { SolicitudInsumosDetalleEntity } from '../../../domain/entities';
import { EstadoSolicitudInsumos } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { InsumoRepository } from '../../../../inventory/domain/repositories/insumo.repository';
import { SolicitudInsumosDetalleRepository } from '../../../domain/repositories/solicitud-insumos-detalle.repository';
import { SolicitudInsumosRepository } from '../../../domain/repositories/solicitud-insumos.repository';
import { CrearDetalleLineaInsumoDto } from '../../dto/solicitud-insumos-detalle-dtos/crear-detalle-linea.dto';

@Injectable()
export class AgregarDetalleLineaInsumoUseCase {
  constructor(
    private readonly solicitudInsumosDetalleRepository: SolicitudInsumosDetalleRepository,
    private readonly solicitudInsumosRepository: SolicitudInsumosRepository,
    private readonly insumoRepository: InsumoRepository,
  ) {}

  async execute(
    solicitudInsumosId: number,
    dto: CrearDetalleLineaInsumoDto,
  ): Promise<SolicitudInsumosDetalleEntity> {
    const solicitud =
      await this.solicitudInsumosRepository.findById(solicitudInsumosId);
    if (!solicitud) {
      throw new ResourceNotFoundError('Solicitud de insumos no encontrada');
    }
    if (solicitud.estado !== EstadoSolicitudInsumos.PENDIENTE) {
      throw new ResourceConflictError(
        'El detalle solo se puede editar mientras la solicitud está pendiente',
      );
    }

    const insumo = await this.insumoRepository.findById(dto.insumo_id);
    if (!insumo) {
      throw new ResourceNotFoundError('Insumo no encontrado');
    }

    const yaExiste =
      await this.solicitudInsumosDetalleRepository.existsByInsumoEnSolicitud(
        solicitudInsumosId,
        dto.insumo_id,
      );
    if (yaExiste) {
      throw new ResourceConflictError(
        'Ese insumo ya está en el detalle de esta solicitud',
      );
    }

    return this.solicitudInsumosDetalleRepository.agregar({
      solicitud_insumos_id: solicitudInsumosId,
      insumo_id: dto.insumo_id,
      cantidad_solicitada: dto.cantidad_solicitada,
    });
  }
}
