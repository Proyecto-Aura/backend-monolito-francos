import { Injectable } from '@nestjs/common';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { PedidoResumen } from '../../../domain/repositories/types/pedido-repository.types';
import { ListPedidosQueryDto } from '../../dto/pedido-dtos/list-pedidos-query.dto';
import { rangoFechasLima } from '../../utils/pedido.utils';

@Injectable()
export class ListPedidosUseCase {
  constructor(private readonly pedidoRepository: PedidoRepository) {}

  // RF-A030 y RF-A037: todos los pedidos, en orden de llegada, con filtros.
  execute(dto: ListPedidosQueryDto): Promise<PaginatedResult<PedidoResumen>> {
    const { desde, hasta } = rangoFechasLima(dto.fecha_desde, dto.fecha_hasta);

    return this.pedidoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      estado: dto.estado,
      origen: dto.origen,
      cliente_id: dto.cliente_id,
      desde,
      hasta,
    });
  }
}
