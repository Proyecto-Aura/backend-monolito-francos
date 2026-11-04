import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { PedidoDetalle } from '../../../domain/repositories/types/pedido-repository.types';

@Injectable()
export class GetPedidoPortalUseCase {
  constructor(private readonly pedidoRepository: PedidoRepository) {}

  // HU-B-013 (RF-B37): el cliente consulta su pedido y ve su estado (confirmado
  // una vez que el pago se completa). Solo ve los suyos: el de otro cliente
  // responde igual que uno que no existe, para no revelar que existe.
  async execute(id: number, userId: string): Promise<PedidoDetalle> {
    const cliente =
      await this.pedidoRepository.findClienteParaResumenPorUser(userId);

    if (!cliente) {
      throw new ResourceNotFoundError(
        'No hay un cliente registrado para este usuario',
      );
    }

    const detalle = await this.pedidoRepository.findDetalleById(id);

    if (!detalle || detalle.pedido.cliente_id !== cliente.id) {
      throw new ResourceNotFoundError('Pedido no encontrado');
    }

    return detalle;
  }
}
