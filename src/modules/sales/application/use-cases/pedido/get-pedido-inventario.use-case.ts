import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { PedidoDetalle } from '../../../domain/repositories/types/pedido-repository.types';
import { esEstadoDeInventario } from '../../../domain/rules/transiciones-pedido';

@Injectable()
export class GetPedidoInventarioUseCase {
  constructor(private readonly pedidoRepository: PedidoRepository) {}

  // Para inventario, un pedido fuera de sus estados no existe.
  async execute(id: number): Promise<PedidoDetalle> {
    const pedido = await this.pedidoRepository.findDetalleById(id);

    if (!pedido || !esEstadoDeInventario(pedido.pedido.estado)) {
      throw new ResourceNotFoundError('Pedido no encontrado');
    }

    return pedido;
  }
}
