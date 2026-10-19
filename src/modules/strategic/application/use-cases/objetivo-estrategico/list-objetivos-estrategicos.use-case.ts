import { Injectable } from '@nestjs/common';
import { ListObjetivoEstrategicoQueryDto } from '../../dto/objetivo-estrategico-dtos/list-objetivo-estrategico-query.dto';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';

@Injectable()
export class ListObjetivosEstrategicosUseCase {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
  ) {}

  async execute(
    dto: ListObjetivoEstrategicoQueryDto,
  ): Promise<PaginatedResult<ObjetivoEstrategicoEntityEnriquecido>> {
    return this.objetivoEstrategicoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      plan_estrategico_id: dto.plan_estrategico_id,
      perspectiva_bsc_id: dto.perspectiva_bsc_id,
      search: dto.search,
    });
  }
}
