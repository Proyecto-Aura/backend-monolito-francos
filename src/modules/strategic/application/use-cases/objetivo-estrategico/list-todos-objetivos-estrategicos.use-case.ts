import { Injectable } from '@nestjs/common';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { ListObjetivoEstrategicoQueryDto } from '../../dto/objetivo-estrategico-dtos/list-objetivo-estrategico-query.dto';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';

@Injectable()
export class ListTodosObjetivosEstrategicosUseCase {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
  ) {}

  async execute(dto: ListObjetivoEstrategicoQueryDto) {
    const tipoModulo = await this.tipoModuloRepository.findByCodigo('NEG');

    if (!tipoModulo) {
      throw new ResourceNotFoundError('Tipo de módulo NEG no encontrado');
    }

    return this.objetivoEstrategicoRepository.findManyIncluyendoInactivos({
      page: dto.page,
      limit: dto.limit,
      plan_estrategico_id: dto.plan_estrategico_id,
      tipo_modulo_id: tipoModulo.id,
      perspectiva_bsc_id: dto.perspectiva_bsc_id,
      search: dto.search,
    });
  }
}
