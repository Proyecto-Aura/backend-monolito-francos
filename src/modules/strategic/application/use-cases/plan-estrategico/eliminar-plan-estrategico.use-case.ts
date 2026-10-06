import { Injectable } from '@nestjs/common';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';

@Injectable()
export class EliminarPlanEstrategicoUseCase {
  constructor(
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
  ) {}

  async execute(id: number): Promise<PlanEstrategicoEntityConEstado> {
    const plan = await this.planEstrategicoRepository.findById(id);

    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }

    if (plan.estado_plan.codigo !== 'BORRADOR') {
      throw new ResourceConflictError(
        'Solo se puede eliminar un plan en estado Borrador',
      );
    }

    return this.planEstrategicoRepository.setEstado(id, false);
  }
}
