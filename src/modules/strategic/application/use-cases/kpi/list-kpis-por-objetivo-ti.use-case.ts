import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { ListKpiQueryDto } from '../../dto/kpi-dtos/list-kpi-query.dto';

@Injectable()
export class ListKpisPorObjetivoTiUseCase {
  constructor(
    private readonly kpiRepository: KpiRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
  ) {}

  async execute(dto: ListKpiQueryDto) {
    const objetivo = await this.objetivoEstrategicoRepository.findActivoById(
      dto.objetivo_estrategico_id,
    );

    const tipoModulo = await this.tipoModuloRepository.findByCodigo('TI');

    if (!objetivo || !tipoModulo || objetivo.tipo_modulo_id !== tipoModulo.id) {
      throw new ResourceNotFoundError('Objetivo estratégico no encontrado');
    }

    return this.kpiRepository.findByObjetivo({
      objetivo_estrategico_id: objetivo.id,
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
    });
  }
}
