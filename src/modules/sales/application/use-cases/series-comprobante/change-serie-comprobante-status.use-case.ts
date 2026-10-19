import { Injectable } from '@nestjs/common';
import { SerieComprobanteEntity } from '../../../domain/entities/serie-comprobante.entity';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { SerieComprobanteRepository } from '../../../domain/repositories/serie-comprobante.repository';

// Desactivar no borra ni reinicia el correlativo: al reactivar se continúa.
@Injectable()
export class ChangeSerieComprobanteStatusUseCase {
  constructor(
    private readonly serieComprobanteRepository: SerieComprobanteRepository,
  ) {}

  async execute(id: number, estado: boolean): Promise<SerieComprobanteEntity> {
    const serie = await this.serieComprobanteRepository.findById(id);
    if (!serie) throw new ResourceNotFoundError('Serie no encontrada');

    if (
      estado &&
      !serie.estado &&
      (await this.serieComprobanteRepository.existsActivaByTipo(serie.tipo, id))
    ) {
      throw new ResourceConflictError(
        `Ya existe una serie activa de tipo ${serie.tipo}; desactívala antes de activar esta`,
      );
    }

    return this.serieComprobanteRepository.setStatus(id, estado);
  }
}
