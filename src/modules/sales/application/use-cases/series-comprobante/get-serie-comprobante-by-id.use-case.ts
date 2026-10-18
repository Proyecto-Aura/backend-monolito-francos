import { Injectable } from '@nestjs/common';
import { SerieComprobanteEntity } from '../../../domain/entities/serie-comprobante.entity';
import { ResourceNotFoundError } from '../../../domain/errors/sales-domain.errors';
import { SerieComprobanteRepository } from '../../../domain/repositories/serie-comprobante.repository';

@Injectable()
export class GetSerieComprobanteByIdUseCase {
  constructor(
    private readonly serieComprobanteRepository: SerieComprobanteRepository,
  ) {}

  async execute(id: number): Promise<SerieComprobanteEntity> {
    const serie = await this.serieComprobanteRepository.findById(id);
    if (!serie) throw new ResourceNotFoundError('Serie no encontrada');
    return serie;
  }
}
