import { Injectable } from '@nestjs/common';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { IndicadoresPedidosDespacho } from '../../../domain/repositories/types/pedido-repository.types';

@Injectable()
export class GetIndicadoresPedidosDespachoUseCase {
  constructor(private readonly pedidoRepository: PedidoRepository) {}

  execute(): Promise<IndicadoresPedidosDespacho> {
    return this.pedidoRepository.getIndicadoresDespacho();
  }
}
