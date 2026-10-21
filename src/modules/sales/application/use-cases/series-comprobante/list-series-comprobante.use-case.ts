import { Injectable } from '@nestjs/common';
import { SerieComprobanteEntity } from '../../../domain/entities/serie-comprobante.entity';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { SerieComprobanteRepository } from '../../../domain/repositories/serie-comprobante.repository';
import { ListSeriesComprobanteQueryDto } from '../../dto/serie-comprobante-dtos/list-series-comprobante-query.dto';

@Injectable()
export class ListSeriesComprobanteUseCase {
  constructor(
    private readonly serieComprobanteRepository: SerieComprobanteRepository,
  ) {}

  execute(
    dto: ListSeriesComprobanteQueryDto,
  ): Promise<PaginatedResult<SerieComprobanteEntity>> {
    return this.serieComprobanteRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      tipo: dto.tipo,
      estado: dto.estado,
      por_agotar: dto.por_agotar,
    });
  }
}
