import { Injectable } from '@nestjs/common';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { PedidoResumen } from '../../../domain/repositories/types/pedido-repository.types';
import { ESTADOS_DE_DESPACHO } from '../../../domain/rules/transiciones-pedido';
import { ListPedidosDespachoQueryDto } from '../../dto/pedido-dtos/list-pedidos-despacho-query.dto';

@Injectable()
export class ListPedidosDespachoUseCase {
  constructor(private readonly pedidoRepository: PedidoRepository) {}

  // RF-A094: pedidos pendientes de entrega, en camino y entregados, en orden de llegada.
  execute(
    dto: ListPedidosDespachoQueryDto,
  ): Promise<PaginatedResult<PedidoResumen>> {
    return this.pedidoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      estados: ESTADOS_DE_DESPACHO,
      estado: dto.estado,
    });
  }
}
