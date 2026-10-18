import { Injectable } from '@nestjs/common';
import { ListIniciativaQueryDto } from '../../dto/iniciativa-dtos/list-iniciativa-query.dto';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';

@Injectable()
export class ListIniciativasPorObjetivoUseCase {
  constructor(
    private readonly iniciativaRepository: IniciativaRepository,
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
  ) {}

  async execute(dto: ListIniciativaQueryDto) {
    const objetivo = await this.objetivoEstrategicoRepository.findActivoById(
      dto.objetivo_estrategico_id,
    );

    if (!objetivo) {
      throw new ResourceNotFoundError('Objetivo estratégico no encontrado');
    }

    return this.iniciativaRepository.findByObjetivo({
      objetivo_estrategico_id: objetivo.id,
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
    });
  }
}
