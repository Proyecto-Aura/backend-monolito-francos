import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/sales-domain.errors';
import { ReembolsoRepository } from '../../../domain/repositories/reembolso.repository';
import { ReembolsoDetalle } from '../../../domain/repositories/types/reembolso-repository.types';
import { EvidenciaReembolsoService } from '../../../domain/services/evidencia-reembolso.service';

@Injectable()
export class GetReembolsoByIdUseCase {
  constructor(
    private readonly reembolsoRepository: ReembolsoRepository,
    private readonly evidenciaService: EvidenciaReembolsoService,
  ) {}

  // RF-A041: detalle con el motivo del cliente, la evidencia y el monto.
  async execute(id: number): Promise<ReembolsoDetalle> {
    const solicitud = await this.reembolsoRepository.findById(id);

    if (!solicitud) {
      throw new ResourceNotFoundError('Solicitud de reembolso no encontrada');
    }

    const { evidencia_key } = solicitud.reembolso;

    return {
      ...solicitud,
      evidencia_url: evidencia_key
        ? await this.evidenciaService.urlDescarga(evidencia_key)
        : null,
    };
  }
}
