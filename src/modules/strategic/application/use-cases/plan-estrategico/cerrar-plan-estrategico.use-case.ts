import { Injectable } from '@nestjs/common';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { EstadoPlanEstrategicoRepository } from '../../../domain/repositories/estado-plan-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';

@Injectable()
export class CerrarPlanEstrategicoUseCase {
  constructor(
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly estadoPlanEstrategicoRepository: EstadoPlanEstrategicoRepository,
  ) {}

  async execute(id: number): Promise<PlanEstrategicoEntityConEstado> {
    const plan = await this.planEstrategicoRepository.findActivoById(id);

    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }

    if (plan.estado_plan.codigo !== 'ACTIVO') {
      throw new ResourceConflictError('Solo un plan Activo puede cerrarse');
    }

    const estadoCerrado =
      await this.estadoPlanEstrategicoRepository.findByCodigo('CERRADO');

    if (!estadoCerrado) {
      throw new ResourceNotFoundError('Estado de plan CERRADO no encontrado');
    }

    return this.planEstrategicoRepository.updateEstado(id, estadoCerrado.id);
  }
}
