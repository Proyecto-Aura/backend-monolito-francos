import { Injectable } from '@nestjs/common';
import { SolicitudInsumosEntity } from '../../../domain/entities';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { InsumoRepository } from '../../../../inventory/domain/repositories/insumo.repository';
import { hoyLima } from '../../../../inventory/application/utils/fecha-rango.utils';
import { SolicitudInsumosRepository } from '../../../domain/repositories/solicitud-insumos.repository';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';
import { CreateSolicitudInsumosDto } from '../../dto/solicitud-insumos-dtos/create-solicitud-insumos.dto';

@Injectable()
export class CreateSolicitudInsumosUseCase {
  constructor(
    private readonly solicitudInsumosRepository: SolicitudInsumosRepository,
    private readonly insumoRepository: InsumoRepository,
    private readonly solicitudProduccionRepository: SolicitudProduccionRepository,
  ) {}

  async execute(
    dto: CreateSolicitudInsumosDto,
    solicitadoPor: string,
  ): Promise<SolicitudInsumosEntity> {
    const codigo_solicitud = dto.codigo_solicitud.trim();
    const existeCodigo =
      await this.solicitudInsumosRepository.existsByCodigo(codigo_solicitud);
    if (existeCodigo) {
      throw new ResourceConflictError(
        'Ya existe una solicitud de insumos con este código',
      );
    }

    if (dto.solicitud_produccion_id !== undefined) {
      const solicitudProduccion =
        await this.solicitudProduccionRepository.findById(
          dto.solicitud_produccion_id,
        );
      if (!solicitudProduccion) {
        throw new ResourceNotFoundError(
          'Solicitud de producción no encontrada',
        );
      }
    }

    const idsVistos = new Set<number>();
    for (const linea of dto.detalle) {
      if (idsVistos.has(linea.insumo_id)) {
        throw new ResourceConflictError(
          `El insumo_id=${linea.insumo_id} está repetido en el detalle`,
        );
      }
      idsVistos.add(linea.insumo_id);

      const insumo = await this.insumoRepository.findById(linea.insumo_id);
      if (!insumo) {
        throw new ResourceNotFoundError(
          `Insumo no encontrado (insumo_id=${linea.insumo_id})`,
        );
      }
    }

    return this.solicitudInsumosRepository.create({
      codigo_solicitud,
      solicitud_produccion_id: dto.solicitud_produccion_id ?? null,
      fecha_creacion: hoyLima(),
      fecha_limite: dto.fecha_limite ? new Date(dto.fecha_limite) : null,
      solicitado_por: solicitadoPor,
      detalle: dto.detalle.map((linea) => ({
        insumo_id: linea.insumo_id,
        cantidad_solicitada: linea.cantidad_solicitada,
      })),
    });
  }
}
