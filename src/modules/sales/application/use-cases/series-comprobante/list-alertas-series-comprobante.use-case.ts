import { Injectable } from '@nestjs/common';
import { SerieComprobanteEntity } from '../../../domain/entities/serie-comprobante.entity';
import { SerieComprobanteRepository } from '../../../domain/repositories/serie-comprobante.repository';

// RF-A192: series activas próximas a agotar su rango.
@Injectable()
export class ListAlertasSeriesComprobanteUseCase {
  constructor(
    private readonly serieComprobanteRepository: SerieComprobanteRepository,
  ) {}

  async execute(): Promise<SerieComprobanteEntity[]> {
    const activas = await this.serieComprobanteRepository.findActivas();
    return activas.filter((serie) => serie.porAgotar);
  }
}
