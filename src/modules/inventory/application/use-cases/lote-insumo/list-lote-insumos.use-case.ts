import { Injectable } from '@nestjs/common';
import { LoteInsumoEntity } from '../../../domain/entities';
import { LoteInsumoRepository } from '../../../domain/repositories/lote-insumo.repository';
import { PaginatedResult } from '../../../../catalog/domain/repositories/types/pagination.types';
import { ListLoteInsumosQueryDto } from '../../dto/lote-insumo-dtos/list-lote-insumos-query.dto';

@Injectable()
export class ListLoteInsumosUseCase {
  constructor(private readonly loteInsumoRepository: LoteInsumoRepository) {}

  async execute(
    dto: ListLoteInsumosQueryDto,
  ): Promise<PaginatedResult<LoteInsumoEntity>> {
    return this.loteInsumoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      insumo_id: dto.insumo_id,
      estado: dto.estado,
      activo: dto.activo,
      vence_desde: dto.vence_desde ? new Date(dto.vence_desde) : undefined,
      vence_hasta: dto.vence_hasta ? new Date(dto.vence_hasta) : undefined,
    });
  }
}
