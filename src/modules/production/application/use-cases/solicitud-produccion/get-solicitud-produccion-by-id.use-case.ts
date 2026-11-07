import { Injectable } from '@nestjs/common';
import {
  SolicitudProduccionDetalleEntity,
  SolicitudProduccionEntity,
} from '../../../domain/entities';
import { ResourceNotFoundError } from '../../../../catalog/domain/errors/catalog-domain.errors';
import { LoteProductoTerminadoRepository } from '../../../domain/repositories/lote-producto-terminado.repository';
import { SolicitudProduccionDetalleRepository } from '../../../domain/repositories/solicitud-produccion-detalle.repository';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';

// lote_creado: si ya existe al menos un lote de producto terminado ligado a
// esta solicitud para esa línea (ver findProductoTerminadoIdsConLotePorSolicitud).
export interface SolicitudProduccionDetalleConLote {
  detalle: SolicitudProduccionDetalleEntity;
  lote_creado: boolean;
}

export interface SolicitudProduccionConDetalle {
  solicitud: SolicitudProduccionEntity;
  detalle: SolicitudProduccionDetalleConLote[];
}

@Injectable()
export class GetSolicitudProduccionByIdUseCase {
  constructor(
    private readonly solicitudProduccionRepository: SolicitudProduccionRepository,
    private readonly solicitudProduccionDetalleRepository: SolicitudProduccionDetalleRepository,
    private readonly loteProductoTerminadoRepository: LoteProductoTerminadoRepository,
  ) {}

  async execute(id: number): Promise<SolicitudProduccionConDetalle> {
    const solicitud = await this.solicitudProduccionRepository.findById(id);
    if (!solicitud) {
      throw new ResourceNotFoundError('Solicitud de producción no encontrada');
    }

    const detalle =
      await this.solicitudProduccionDetalleRepository.findBySolicitudId(id);
    const productosConLote = new Set(
      await this.loteProductoTerminadoRepository.findProductoTerminadoIdsConLotePorSolicitud(
        id,
      ),
    );

    return {
      solicitud,
      detalle: detalle.map((d) => ({
        detalle: d,
        lote_creado: productosConLote.has(d.producto_terminado_id),
      })),
    };
  }
}
