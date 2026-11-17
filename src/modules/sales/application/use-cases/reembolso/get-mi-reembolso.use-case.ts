import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { ReembolsoRepository } from '../../../domain/repositories/reembolso.repository';
import { ReembolsoDetalle } from '../../../domain/repositories/types/reembolso-repository.types';
import { EvidenciaReembolsoService } from '../../../domain/services/evidencia-reembolso.service';

// RF-B41: detalle de una solicitud propia, con el motivo del rechazo si lo hay
// y un enlace temporal a la evidencia. Una solicitud ajena no existe.
@Injectable()
export class GetMiReembolsoUseCase {
  constructor(
    private readonly pedidoRepository: PedidoRepository,
    private readonly reembolsoRepository: ReembolsoRepository,
    private readonly evidenciaService: EvidenciaReembolsoService,
  ) {}

  async execute(id: number, userId: string): Promise<ReembolsoDetalle> {
    const cliente =
      await this.pedidoRepository.findClienteParaResumenPorUser(userId);

    if (!cliente) {
      throw new ResourceNotFoundError(
        'No hay un cliente registrado para este usuario',
      );
    }

    const solicitud = await this.reembolsoRepository.findByIdDeCliente(
      id,
      cliente.id,
    );

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
