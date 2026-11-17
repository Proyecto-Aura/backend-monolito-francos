import { Injectable } from '@nestjs/common';
import { ListObjetivoEstrategicoQueryDto } from '../../dto/objetivo-estrategico-dtos/list-objetivo-estrategico-query.dto';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';

@Injectable()
export class ListObjetivosEstrategicosUseCase {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
  ) {}

  async execute(
    dto: ListObjetivoEstrategicoQueryDto,
  ): Promise<PaginatedResult<ObjetivoEstrategicoEntityEnriquecido>> {
    const tipoModulo = await this.tipoModuloRepository.findByCodigo('NEG');

    if (!tipoModulo) {
      throw new ResourceNotFoundError('Tipo de módulo NEG no encontrado');
    }

    return this.objetivoEstrategicoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      plan_estrategico_id: dto.plan_estrategico_id,
      tipo_modulo_id: tipoModulo.id,
      perspectiva_bsc_id: dto.perspectiva_bsc_id,
      search: dto.search,
    });
  }
}
