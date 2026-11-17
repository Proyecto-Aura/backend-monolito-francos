import { Injectable } from '@nestjs/common';
import { InsumoEntity } from '../../../domain/entities';
import { InsumoRepository } from '../../../domain/repositories/insumo.repository';
import { PaginatedResult } from '../../../../catalog/domain/repositories/types/pagination.types';
import { ListInsumosQueryDto } from '../../dto/insumo-dtos/list-insumos-query.dto';

@Injectable()
export class ListInsumosUseCase {
  constructor(private readonly insumoRepository: InsumoRepository) {}

  async execute(
    dto: ListInsumosQueryDto,
  ): Promise<PaginatedResult<InsumoEntity>> {
    return this.insumoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado: dto.estado,
      tipo: dto.tipo,
      nivel: dto.nivel,
    });
  }
}
