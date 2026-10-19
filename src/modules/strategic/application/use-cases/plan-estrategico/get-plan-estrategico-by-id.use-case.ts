import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';

@Injectable()
export class GetPlanEstrategicoByIdUseCase {
  constructor(
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
  ) {}

  async execute(id: number): Promise<PlanEstrategicoEntityConEstado> {
    const plan = await this.planEstrategicoRepository.findActivoById(id);

    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }

    return plan;
  }
}
