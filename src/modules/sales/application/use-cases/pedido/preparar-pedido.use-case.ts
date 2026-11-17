import { Injectable } from '@nestjs/common';
import { EstadoPedido } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { PedidoDetalle } from '../../../domain/repositories/types/pedido-repository.types';
import { esTransicionDeInventario } from '../../../domain/rules/transiciones-pedido';

// El operario de productos terminados empieza a preparar un pedido que
// ventas ya puso en espera de inventario.
@Injectable()
export class PrepararPedidoUseCase {
  constructor(private readonly pedidoRepository: PedidoRepository) {}

  async execute(id: number): Promise<PedidoDetalle> {
    const pedido = await this.pedidoRepository.findById(id);

    if (!pedido) {
      throw new ResourceNotFoundError('Pedido no encontrado');
    }

    if (!esTransicionDeInventario(pedido.estado, EstadoPedido.EN_PREPARACION)) {
      throw new ResourceConflictError(
        `No se puede pasar el pedido ${pedido.codigo} de ${pedido.estado} a ${EstadoPedido.EN_PREPARACION}`,
      );
    }

    const cambiado = await this.pedidoRepository.cambiarEstado(
      id,
      pedido.estado,
      EstadoPedido.EN_PREPARACION,
    );

    if (!cambiado) {
      throw new ResourceConflictError(
        `El pedido ${pedido.codigo} cambió de estado mientras tanto; vuelve a consultarlo`,
      );
    }

    const actualizado = await this.pedidoRepository.findDetalleById(id);
    if (!actualizado) {
      throw new ResourceNotFoundError('Pedido no encontrado');
    }

    return actualizado;
  }
}
