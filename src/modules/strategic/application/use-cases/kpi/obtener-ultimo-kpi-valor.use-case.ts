import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { KpiValorRepository } from '../../../domain/repositories/kpi-valor.repository';

@Injectable()
export class ObtenerUltimoKpiValorUseCase {
  constructor(
    private readonly kpiRepository: KpiRepository,
    private readonly kpiValorRepository: KpiValorRepository,
  ) {}

  async execute(kpiId: number) {
    const kpi = await this.kpiRepository.findById(kpiId);

    if (!kpi || !kpi.estado) {
      throw new ResourceNotFoundError('KPI no encontrado');
    }

    return this.kpiValorRepository.findUltimoByKpi(kpiId);
  }
}
