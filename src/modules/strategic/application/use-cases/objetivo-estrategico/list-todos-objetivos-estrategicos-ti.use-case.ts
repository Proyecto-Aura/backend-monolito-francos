import { Injectable } from '@nestjs/common';
import { ListObjetivoEstrategicoQueryDto } from '../../dto/objetivo-estrategico-dtos/list-objetivo-estrategico-query.dto';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';

@Injectable()
export class ListTodosObjetivosEstrategicosTiUseCase {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
  ) {}

  async execute(dto: ListObjetivoEstrategicoQueryDto) {
    const tipoModulo = await this.tipoModuloRepository.findByCodigo('TI');

    if (!tipoModulo) {
      throw new ResourceNotFoundError('Tipo de módulo TI no encontrado');
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
