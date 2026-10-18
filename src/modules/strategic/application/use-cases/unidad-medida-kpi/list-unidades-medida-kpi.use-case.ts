import { Injectable } from '@nestjs/common';
import { UnidadMedidaKpiEntity } from '../../../domain/entities';
import { UnidadMedidaKpiRepository } from '../../../domain/repositories/unidad-medida-kpi.repository';

@Injectable()
export class ListUnidadesMedidaKpiUseCase {
  constructor(
    private readonly unidadMedidaKpiRepository: UnidadMedidaKpiRepository,
  ) {}

  async execute(): Promise<UnidadMedidaKpiEntity[]> {
    return this.unidadMedidaKpiRepository.findAll();
  }
}
