import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { PedidoDetalle } from '../../../domain/repositories/types/pedido-repository.types';

@Injectable()
export class GetPedidoByIdUseCase {
  constructor(private readonly pedidoRepository: PedidoRepository) {}

  // RF-A031: detalle completo con productos y pago.
  async execute(id: number): Promise<PedidoDetalle> {
    const pedido = await this.pedidoRepository.findDetalleById(id);

    if (!pedido) {
      throw new ResourceNotFoundError('Pedido no encontrado');
    }

    return pedido;
  }
}
