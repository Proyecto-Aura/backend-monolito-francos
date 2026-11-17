import { Injectable } from '@nestjs/common';
import { PedidoEntity } from '../../../domain/entities';
import { EstadoPedido } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';

// RF-A036: el stock ya se descontó cuando inventario dejó el pedido
// "pendiente_entrega" (EntregarPedidoADespachoUseCase, salida FEFO real).
// Acá solo se registra la entrega -- según RN6, solo el operario de despacho
// la marca, y solo desde "en camino"; lo dispara
// PATCH /despacho/pedidos/:id/entregado.
@Injectable()
export class CompletarPedidoUseCase {
  constructor(private readonly pedidoRepository: PedidoRepository) {}

  async execute(id: number): Promise<PedidoEntity> {
    const pedido = await this.pedidoRepository.findById(id);

    if (!pedido) {
      throw new ResourceNotFoundError('Pedido no encontrado');
    }

    if (pedido.estado !== EstadoPedido.EN_CAMINO) {
      throw new ResourceConflictError(
        'Solo se puede completar un pedido que está en camino',
      );
    }

    return this.pedidoRepository.marcarEntregado(id);
  }
}
