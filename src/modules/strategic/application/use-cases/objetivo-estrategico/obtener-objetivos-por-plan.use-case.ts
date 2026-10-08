import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';

@Injectable()
export class ObtenerObjetivosPorPlanUseCase {
  constructor(
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
  ) {}

  async execute(planId: number) {
    const plan = await this.planEstrategicoRepository.findById(planId);
    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }

    const tipoModulo = await this.tipoModuloRepository.findByCodigo('NEG');
    if (!tipoModulo) {
      throw new ResourceNotFoundError('Tipo de módulo no encontrado');
    }

    const objetivos =
      await this.objetivoEstrategicoRepository.findActivosPorPlan(
        planId,
        tipoModulo.id,
      );

    return { plan, objetivos };
  }
}
