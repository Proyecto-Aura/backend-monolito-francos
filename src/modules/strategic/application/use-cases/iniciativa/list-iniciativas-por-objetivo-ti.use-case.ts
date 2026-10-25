import { Injectable } from '@nestjs/common';
import { ListIniciativaQueryDto } from '../../dto/iniciativa-dtos/list-iniciativa-query.dto';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';

@Injectable()
export class ListIniciativasPorObjetivoTiUseCase {
  constructor(
    private readonly iniciativaRepository: IniciativaRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
  ) {}

  async execute(dto: ListIniciativaQueryDto) {
    const objetivo = await this.objetivoEstrategicoRepository.findActivoById(
      dto.objetivo_estrategico_id,
    );

    const tipoModulo = await this.tipoModuloRepository.findByCodigo('TI');

    if (!objetivo || !tipoModulo || objetivo.tipo_modulo_id !== tipoModulo.id) {
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
