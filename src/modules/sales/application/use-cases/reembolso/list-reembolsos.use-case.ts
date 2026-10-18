import { Injectable } from '@nestjs/common';
import { ReembolsoRepository } from '../../../domain/repositories/reembolso.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { ReembolsoConPedido } from '../../../domain/repositories/types/reembolso-repository.types';
import { ListReembolsosQueryDto } from '../../dto/reembolso-dtos/list-reembolsos-query.dto';
import { rangoFechasLima } from '../../utils/pedido.utils';

@Injectable()
export class ListReembolsosUseCase {
  constructor(private readonly reembolsoRepository: ReembolsoRepository) {}

  // RF-A039 y RF-A040: solicitudes de los clientes, filtradas por estado.
  execute(
    dto: ListReembolsosQueryDto,
  ): Promise<PaginatedResult<ReembolsoConPedido>> {
    const { desde, hasta } = rangoFechasLima(dto.fecha_desde, dto.fecha_hasta);

    return this.reembolsoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      estado: dto.estado,
      desde,
      hasta,
      q: dto.q?.trim() || undefined,
    });
  }
}
