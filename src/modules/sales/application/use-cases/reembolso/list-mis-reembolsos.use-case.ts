import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { ReembolsoRepository } from '../../../domain/repositories/reembolso.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { ReembolsoConPedido } from '../../../domain/repositories/types/reembolso-repository.types';
import { ListMisReembolsosQueryDto } from '../../dto/reembolso-dtos/list-mis-reembolsos-query.dto';

// RF-B41: el cliente consulta solo sus propias solicitudes y su estado.
@Injectable()
export class ListMisReembolsosUseCase {
  constructor(
    private readonly pedidoRepository: PedidoRepository,
    private readonly reembolsoRepository: ReembolsoRepository,
  ) {}

  async execute(
    dto: ListMisReembolsosQueryDto,
    userId: string,
  ): Promise<PaginatedResult<ReembolsoConPedido>> {
    const cliente =
      await this.pedidoRepository.findClienteParaResumenPorUser(userId);

    if (!cliente) {
      throw new ResourceNotFoundError(
        'No hay un cliente registrado para este usuario',
      );
    }

    return this.reembolsoRepository.findManyDeCliente(cliente.id, {
      page: dto.page,
      limit: dto.limit,
      estado: dto.estado,
    });
  }
}
