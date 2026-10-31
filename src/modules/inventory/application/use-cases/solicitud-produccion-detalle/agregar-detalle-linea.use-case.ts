import { Injectable } from '@nestjs/common';
import { SolicitudProduccionDetalleEntity } from '../../../domain/entities';
import { EstadoSolicitudProduccion } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { ProductoTerminadoRepository } from '../../../domain/repositories/producto-terminado.repository';
import { SolicitudProduccionDetalleRepository } from '../../../domain/repositories/solicitud-produccion-detalle.repository';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';
import { CrearDetalleLineaDto } from '../../dto/solicitud-produccion-detalle-dtos/crear-detalle-linea.dto';

@Injectable()
export class AgregarDetalleLineaUseCase {
  constructor(
    private readonly solicitudProduccionDetalleRepository: SolicitudProduccionDetalleRepository,
    private readonly solicitudProduccionRepository: SolicitudProduccionRepository,
    private readonly productoTerminadoRepository: ProductoTerminadoRepository,
  ) {}

  async execute(
    solicitudProduccionId: number,
    dto: CrearDetalleLineaDto,
  ): Promise<SolicitudProduccionDetalleEntity> {
    const solicitud = await this.solicitudProduccionRepository.findById(
      solicitudProduccionId,
    );
    if (!solicitud) {
      throw new ResourceNotFoundError('Solicitud de producción no encontrada');
    }
    if (solicitud.estado !== EstadoSolicitudProduccion.PENDIENTE) {
      throw new ResourceConflictError(
        'El detalle solo se puede editar mientras la solicitud está pendiente',
      );
    }

    const producto = await this.productoTerminadoRepository.findById(
      dto.producto_terminado_id,
    );
    if (!producto) {
      throw new ResourceNotFoundError('Producto terminado no encontrado');
    }

    const yaExiste =
      await this.solicitudProduccionDetalleRepository.existsByProductoEnSolicitud(
        solicitudProduccionId,
        dto.producto_terminado_id,
      );
    if (yaExiste) {
      throw new ResourceConflictError(
        'Ese producto ya está en el detalle de esta solicitud',
      );
    }

    return this.solicitudProduccionDetalleRepository.agregar({
      solicitud_produccion_id: solicitudProduccionId,
      producto_terminado_id: dto.producto_terminado_id,
      cantidad_solicitada: dto.cantidad_solicitada,
    });
  }
}
