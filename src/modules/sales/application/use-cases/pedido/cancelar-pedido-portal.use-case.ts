import { Injectable } from '@nestjs/common';
import { EstadoPedido } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { PedidoDetalle } from '../../../domain/repositories/types/pedido-repository.types';
import { esPedidoCancelable } from '../../../domain/rules/transiciones-pedido';

// El cliente cancela su propio pedido mientras siga cancelable ("confirmado"
// o "en_espera_inventario" — para el cliente son el mismo paso visual,
// "Confirmado"), antes de que inventario empiece a prepararlo. No toca el
// pago ni dispara un reembolso — eso se maneja aparte.
@Injectable()
export class CancelarPedidoPortalUseCase {
  constructor(private readonly pedidoRepository: PedidoRepository) {}

  async execute(id: number, userId: string): Promise<PedidoDetalle> {
    const cliente =
      await this.pedidoRepository.findClienteParaResumenPorUser(userId);

    if (!cliente) {
      throw new ResourceNotFoundError(
        'No hay un cliente registrado para este usuario',
      );
    }

    const detalle = await this.pedidoRepository.findDetalleById(id);

    // Solo ve los suyos: el de otro cliente responde igual que uno que no
    // existe, para no revelar que existe (mismo criterio que consultarlo).
    if (!detalle || detalle.pedido.cliente_id !== cliente.id) {
      throw new ResourceNotFoundError('Pedido no encontrado');
    }

    if (!esPedidoCancelable(detalle.pedido.estado)) {
      throw new ResourceConflictError(
        `El pedido ${detalle.pedido.codigo} ya no se puede cancelar: pasó a ${detalle.pedido.estado}`,
      );
    }

    const cambiado = await this.pedidoRepository.cambiarEstado(
      id,
      detalle.pedido.estado,
      EstadoPedido.CANCELADO,
    );

    if (!cambiado) {
      throw new ResourceConflictError(
        `El pedido ${detalle.pedido.codigo} cambió de estado mientras tanto; vuelve a consultarlo`,
      );
    }

    const actualizado = await this.pedidoRepository.findDetalleById(id);
    if (!actualizado) {
      throw new ResourceNotFoundError('Pedido no encontrado');
    }

    return actualizado;
  }
}
