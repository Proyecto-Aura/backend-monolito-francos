import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { PedidoResumenPortal } from '../../../domain/repositories/types/pedido-repository.types';
import { ListPedidosPortalQueryDto } from '../../dto/pedido-dtos/list-pedidos-portal-query.dto';

@Injectable()
export class ListPedidosPortalUseCase {
  constructor(private readonly pedidoRepository: PedidoRepository) {}

  async execute(
    dto: ListPedidosPortalQueryDto,
    userId: string,
  ): Promise<PaginatedResult<PedidoResumenPortal>> {
    const cliente =
      await this.pedidoRepository.findClienteParaResumenPorUser(userId);

    if (!cliente) {
      throw new ResourceNotFoundError(
        'No hay un cliente registrado para este usuario',
      );
    }

    return this.pedidoRepository.findManyDeCliente(cliente.id, {
      page: dto.page,
      limit: dto.limit,
      estado: dto.estado,
    });
  }
}
