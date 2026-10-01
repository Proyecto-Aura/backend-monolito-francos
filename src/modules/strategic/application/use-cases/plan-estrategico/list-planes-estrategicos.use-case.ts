import { Injectable } from '@nestjs/common';
import { ListPlanEstrategicoQueryDto } from '../../dto/plan-estrategico-dtos/list-plan-estrategico-query.dto';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';

@Injectable()
export class ListPlanesEstrategicosUseCase {
  constructor(
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
  ) {}

  async execute(
    dto: ListPlanEstrategicoQueryDto,
  ): Promise<PaginatedResult<PlanEstrategicoEntityConEstado>> {
    return this.planEstrategicoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado_codigo: dto.estado_codigo,
    });
  }
}
