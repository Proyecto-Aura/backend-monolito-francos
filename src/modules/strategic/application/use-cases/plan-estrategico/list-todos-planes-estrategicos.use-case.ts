import { Injectable } from '@nestjs/common';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { ListPlanEstrategicoQueryDto } from '../../dto/plan-estrategico-dtos/list-plan-estrategico-query.dto';

@Injectable()
export class ListTodosPlanesEstrategicosUseCase {
  constructor(
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
  ) {}

  async execute(dto: ListPlanEstrategicoQueryDto) {
    return this.planEstrategicoRepository.findManyIncluyendoInactivos({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado_codigo: dto.estado_codigo,
    });
  }
}
