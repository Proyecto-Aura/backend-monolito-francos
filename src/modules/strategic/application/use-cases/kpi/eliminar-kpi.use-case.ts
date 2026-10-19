import { Injectable } from '@nestjs/common';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { KpiValorRepository } from '../../../domain/repositories/kpi-valor.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { KpiEntityEnriquecido } from '../../../domain/repositories/types/kpi-repository.types';

@Injectable()
export class EliminarKpiUseCase {
  constructor(
    private readonly kpiRepository: KpiRepository,
    private readonly kpiValorRepository: KpiValorRepository,
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
  ) {}

  async execute(id: number): Promise<KpiEntityEnriquecido> {
    const kpi = await this.kpiRepository.findById(id);

    if (!kpi || !kpi.estado) {
      throw new ResourceNotFoundError('KPI no encontrado');
    }

    const objetivo = await this.objetivoEstrategicoRepository.findActivoById(
      kpi.objetivo_estrategico.id,
    );

    if (!objetivo) {
      throw new ResourceNotFoundError('Objetivo estratégico no encontrado');
    }

    const plan = await this.planEstrategicoRepository.findActivoById(
      objetivo.plan_estrategico_id,
    );

    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }

    if (plan.estado_plan.codigo !== 'BORRADOR') {
      throw new ResourceConflictError(
        'Solo se pueden eliminar KPIs cuando el plan está en Borrador',
      );
    }

    const tieneValoresActivos =
      await this.kpiValorRepository.existsActivosByKpi(id);

    if (tieneValoresActivos) {
      throw new ResourceConflictError(
        'No se puede eliminar un KPI que tiene valores de progreso registrados',
      );
    }

    return this.kpiRepository.setEstado(id, false);
  }
}
