import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { PerspectivaBscRepository } from '../../../domain/repositories/perspectiva-bsc.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { TableroControlResultado } from './obtener-tablero-control.use-case';

@Injectable()
export class ObtenerTableroControlTiUseCase {
  constructor(
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly perspectivaBscRepository: PerspectivaBscRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly kpiRepository: KpiRepository,
    private readonly iniciativaRepository: IniciativaRepository,
  ) {}

  async execute(planId: number): Promise<TableroControlResultado> {
    const plan = await this.planEstrategicoRepository.findActivoById(planId);

    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }

    const [perspectivas, tipoModulo] = await Promise.all([
      this.perspectivaBscRepository.findAll(),
      this.tipoModuloRepository.findByCodigo('TI'),
    ]);

    if (!tipoModulo) {
      throw new ResourceNotFoundError('Tipo de módulo TI no encontrado');
    }

    const [kpis, iniciativas] = await Promise.all([
      this.kpiRepository.findParaTableroControl(plan.id, tipoModulo.id),
      this.iniciativaRepository.findResumenPorPlan(plan.id, tipoModulo.id),
    ]);

    return { plan, perspectivas, kpis, iniciativas };
  }
}
