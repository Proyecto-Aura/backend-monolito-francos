import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { PeriodoRepository } from '../../../domain/repositories/periodo.repository';
import { PerspectivaBscRepository } from '../../../domain/repositories/perspectiva-bsc.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { SeguimientoKpisResultado } from './obtener-seguimiento-kpis.use-case';

@Injectable()
export class ObtenerSeguimientoKpisTiUseCase {
  constructor(
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly perspectivaBscRepository: PerspectivaBscRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly kpiRepository: KpiRepository,
    private readonly periodoRepository: PeriodoRepository,
  ) {}

  async execute(planId: number): Promise<SeguimientoKpisResultado> {
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

    const kpis = await this.kpiRepository.findSeguimientoPorPlan(
      plan.id,
      tipoModulo.id,
    );

    const frecuenciaIds = [...new Set(kpis.map((kpi) => kpi.frecuencia.id))];
    const periodosPorFrecuencia = new Map(
      await Promise.all(
        frecuenciaIds.map(
          async (id) =>
            [id, await this.periodoRepository.findByFrecuencia(id)] as const,
        ),
      ),
    );

    return { plan, perspectivas, kpis, periodosPorFrecuencia };
  }
}
