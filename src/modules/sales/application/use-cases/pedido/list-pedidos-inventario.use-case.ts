import { Injectable } from '@nestjs/common';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { PedidoResumen } from '../../../domain/repositories/types/pedido-repository.types';
import { ESTADOS_DE_INVENTARIO } from '../../../domain/rules/transiciones-pedido';
import { ListPedidosInventarioQueryDto } from '../../dto/pedido-dtos/list-pedidos-inventario-query.dto';
import { rangoFechasLima } from '../../utils/pedido.utils';

@Injectable()
export class ListPedidosInventarioUseCase {
  constructor(private readonly pedidoRepository: PedidoRepository) {}

  // Pedidos por preparar: en_espera_inventario, en_preparacion y pendiente_entrega.
  execute(
    dto: ListPedidosInventarioQueryDto,
  ): Promise<PaginatedResult<PedidoResumen>> {
    // fecha_desde/fecha_hasta tienen prioridad; `fecha` queda por compatibilidad
    // (equivale a mandar el mismo día en ambos extremos).
    const { desde, hasta } = rangoFechasLima(
      dto.fecha_desde ?? dto.fecha,
      dto.fecha_hasta ?? dto.fecha,
    );

    return this.pedidoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      estados: ESTADOS_DE_INVENTARIO,
      estado: dto.estado,
      search: dto.search,
      desde,
      hasta,
    });
  }
}
