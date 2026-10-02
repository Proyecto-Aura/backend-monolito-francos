import { Injectable } from '@nestjs/common';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';

@Injectable()
export class EliminarRelacionOeUseCase {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
  ) {}

  async execute(
    id: number,
    relacionId: number,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido> {
    const objetivo = await this.objetivoEstrategicoRepository.findById(id);

    if (!objetivo) {
      throw new ResourceNotFoundError('Objetivo estratégico no encontrado');
    }

    const relacion =
      await this.objetivoEstrategicoRepository.findRelacionById(relacionId);

    if (!relacion || !relacion.estado || relacion.origen_id !== id) {
      throw new ResourceNotFoundError('Relación no encontrada');
    }

    const plan = await this.planEstrategicoRepository.findById(
      objetivo.plan_estrategico_id,
    );

    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }

    if (plan.estado_plan.codigo !== 'BORRADOR') {
      throw new ResourceConflictError(
        'Solo se pueden eliminar relaciones cuando el plan está en Borrador',
      );
    }

    await this.objetivoEstrategicoRepository.eliminarRelacion(relacionId);

    const objetivoActualizado =
      await this.objetivoEstrategicoRepository.findById(id);

    if (!objetivoActualizado) {
      throw new ResourceNotFoundError('Objetivo estratégico no encontrado');
    }

    return objetivoActualizado;
  }
}
