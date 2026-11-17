import { Injectable } from '@nestjs/common';
import { EstadoPedido } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { PedidoDetalle } from '../../../domain/repositories/types/pedido-repository.types';
import { esTransicionDeDespacho } from '../../../domain/rules/transiciones-pedido';

// HU-A-023 (RF-A096, RF-A097): el operador de despacho saca a reparto un pedido
// pendiente de entrega, y el cliente recibe el aviso en el portal.
@Injectable()
export class DespacharPedidoUseCase {
  constructor(private readonly pedidoRepository: PedidoRepository) {}

  async execute(id: number): Promise<PedidoDetalle> {
    const pedido = await this.pedidoRepository.findById(id);

    if (!pedido) {
      throw new ResourceNotFoundError('Pedido no encontrado');
    }

    if (!esTransicionDeDespacho(pedido.estado, EstadoPedido.EN_CAMINO)) {
      throw new ResourceConflictError(
        `No se puede pasar el pedido ${pedido.codigo} de ${pedido.estado} a ${EstadoPedido.EN_CAMINO}`,
      );
    }

    const cambiado = await this.pedidoRepository.marcarEnCamino(id, {
      titulo: 'Tu pedido está en camino',
      mensaje: `Tu pedido ${pedido.codigo} salió a reparto y está en camino.`,
    });

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
