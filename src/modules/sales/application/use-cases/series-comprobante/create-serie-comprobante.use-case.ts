import { Injectable } from '@nestjs/common';
import { SerieComprobanteEntity } from '../../../domain/entities/serie-comprobante.entity';
import { ResourceConflictError } from '../../../domain/errors/sales-domain.errors';
import { SerieComprobanteRepository } from '../../../domain/repositories/serie-comprobante.repository';
import { CreateSerieComprobanteDto } from '../../dto/serie-comprobante-dtos/create-serie-comprobante.dto';
import {
  UMBRAL_ALERTA_POR_DEFECTO,
  assertRangoValido,
  assertSerieCoincideConTipo,
} from './serie-comprobante.rules';

@Injectable()
export class CreateSerieComprobanteUseCase {
  constructor(
    private readonly serieComprobanteRepository: SerieComprobanteRepository,
  ) {}

  async execute(
    dto: CreateSerieComprobanteDto,
  ): Promise<SerieComprobanteEntity> {
    assertSerieCoincideConTipo(dto.tipo, dto.serie);
    assertRangoValido(dto.correlativo_inicio, dto.correlativo_fin);

    if (await this.serieComprobanteRepository.existsBySerie(dto.serie)) {
      throw new ResourceConflictError('Ya existe una serie con ese código');
    }

    const estado = dto.estado ?? true;
    if (
      estado &&
      (await this.serieComprobanteRepository.existsActivaByTipo(dto.tipo))
    ) {
      throw new ResourceConflictError(
        `Ya existe una serie activa de tipo ${dto.tipo}; desactívala antes de activar otra`,
      );
    }

    return this.serieComprobanteRepository.create({
      tipo: dto.tipo,
      serie: dto.serie,
      correlativo_inicio: dto.correlativo_inicio,
      correlativo_fin: dto.correlativo_fin,
      // Todavía no emitió: el primer número reservado será `correlativo_inicio`.
      correlativo_actual: dto.correlativo_inicio - 1,
      umbral_alerta: dto.umbral_alerta ?? UMBRAL_ALERTA_POR_DEFECTO,
      estado,
    });
  }
}
