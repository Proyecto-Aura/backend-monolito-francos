import { Injectable } from '@nestjs/common';
import { EstadoPedido } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { PedidoDetalle } from '../../../domain/repositories/types/pedido-repository.types';
import { esTransicionDeVentas } from '../../../domain/rules/transiciones-pedido';

// HU-A-010 (RF-A038): el operador de ventas pasa un pedido de "confirmado" a
// "en espera de inventario", y desde ahí lo ve el operador de productos terminados.
@Injectable()
export class ActualizarEstadoPedidoUseCase {
  constructor(private readonly pedidoRepository: PedidoRepository) {}

  async execute(id: number, estado: EstadoPedido): Promise<PedidoDetalle> {
    const pedido = await this.pedidoRepository.findById(id);

    if (!pedido) {
      throw new ResourceNotFoundError('Pedido no encontrado');
    }

    if (!esTransicionDeVentas(pedido.estado, estado)) {
      throw new ResourceConflictError(
        `No se puede pasar el pedido ${pedido.codigo} de ${pedido.estado} a ${estado}`,
      );
    }

    const cambiado = await this.pedidoRepository.cambiarEstado(
      id,
      pedido.estado,
      estado,
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
