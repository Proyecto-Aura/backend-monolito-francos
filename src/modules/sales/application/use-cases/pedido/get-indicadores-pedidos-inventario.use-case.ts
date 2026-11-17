import { Injectable } from '@nestjs/common';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { IndicadoresPedidosInventario } from '../../../domain/repositories/types/pedido-repository.types';

@Injectable()
export class GetIndicadoresPedidosInventarioUseCase {
  constructor(private readonly pedidoRepository: PedidoRepository) {}

  execute(): Promise<IndicadoresPedidosInventario> {
    return this.pedidoRepository.getIndicadoresInventario();
  }
}
