import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { FrecuenciaMedicionRepository } from '../../../domain/repositories/frecuencia-medicion.repository';
import { PeriodoRepository } from '../../../domain/repositories/periodo.repository';
import { ListPeriodosQueryDto } from '../../dto/periodo-dtos/list-periodos-query.dto';

@Injectable()
export class ListPeriodosPorFrecuenciaUseCase {
  constructor(
    private readonly periodoRepository: PeriodoRepository,
    private readonly frecuenciaMedicionRepository: FrecuenciaMedicionRepository,
  ) {}

  async execute(dto: ListPeriodosQueryDto) {
    const frecuencia = await this.frecuenciaMedicionRepository.findById(
      dto.frecuencia_id,
    );

    if (!frecuencia || !frecuencia.estado) {
      throw new ResourceNotFoundError('Frecuencia de medición no encontrada');
    }

    return this.periodoRepository.findByFrecuencia(frecuencia.id);
  }
}
