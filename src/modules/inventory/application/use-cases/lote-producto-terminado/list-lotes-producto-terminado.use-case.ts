import { Injectable } from '@nestjs/common';
import { LoteProductoTerminadoEntity } from '../../../domain/entities';
import { LoteProductoTerminadoRepository } from '../../../domain/repositories/lote-producto-terminado.repository';
import { PaginatedResult } from '../../../../catalog/domain/repositories/types/pagination.types';
import { ListLoteProductoTerminadoQueryDto } from '../../dto/lote-producto-terminado-dtos/list-lote-producto-terminado-query.dto';

@Injectable()
export class ListLotesProductoTerminadoUseCase {
  constructor(
    private readonly loteProductoTerminadoRepository: LoteProductoTerminadoRepository,
  ) {}

  async execute(
    dto: ListLoteProductoTerminadoQueryDto,
  ): Promise<PaginatedResult<LoteProductoTerminadoEntity>> {
    return this.loteProductoTerminadoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      producto_terminado_id: dto.producto_terminado_id,
      estado: dto.estado,
      activo: dto.activo,
      vence_desde: dto.vence_desde ? new Date(dto.vence_desde) : undefined,
      vence_hasta: dto.vence_hasta ? new Date(dto.vence_hasta) : undefined,
    });
  }
}
