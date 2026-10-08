import { Injectable } from '@nestjs/common';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { ListObjetivoEstrategicoQueryDto } from '../../dto/objetivo-estrategico-dtos/list-objetivo-estrategico-query.dto';

@Injectable()
export class ListTodosObjetivosEstrategicosUseCase {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
  ) {}

  async execute(dto: ListObjetivoEstrategicoQueryDto) {
    return this.objetivoEstrategicoRepository.findManyIncluyendoInactivos({
      page: dto.page,
      limit: dto.limit,
      plan_estrategico_id: dto.plan_estrategico_id,
      perspectiva_bsc_id: dto.perspectiva_bsc_id,
      search: dto.search,
    });
  }
}
