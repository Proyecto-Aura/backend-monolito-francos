import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';

@Injectable()
export class ObtenerKpisPorPlanUseCase {
  constructor(
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly kpiRepository: KpiRepository,
  ) {}

  async execute(planId: number) {
    const plan = await this.planEstrategicoRepository.findActivoById(planId);

    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }

    const tipoModulo = await this.tipoModuloRepository.findByCodigo('NEG');

    if (!tipoModulo) {
      throw new ResourceNotFoundError('Tipo de módulo no encontrado');
    }

    return this.kpiRepository.findResumenPorPlan(planId, tipoModulo.id);
  }
}
