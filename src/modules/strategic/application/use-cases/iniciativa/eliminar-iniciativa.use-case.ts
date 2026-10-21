import { Injectable } from '@nestjs/common';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { IniciativaEntityEnriquecido } from '../../../domain/repositories/types/iniciativa-repository.types';

@Injectable()
export class EliminarIniciativaUseCase {
  constructor(
    private readonly iniciativaRepository: IniciativaRepository,
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
  ) {}

  async execute(id: number): Promise<IniciativaEntityEnriquecido> {
    const iniciativa = await this.iniciativaRepository.findById(id);

    if (!iniciativa || !iniciativa.estado) {
      throw new ResourceNotFoundError('Iniciativa no encontrada');
    }

    const objetivo = await this.objetivoEstrategicoRepository.findActivoById(
      iniciativa.objetivo_estrategico.id,
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
        'Solo se pueden eliminar iniciativas cuando el plan está en Borrador',
      );
    }

    if (iniciativa.estado_iniciativa.codigo !== 'PENDIENTE') {
      throw new ResourceConflictError(
        'Solo se pueden eliminar iniciativas en estado Pendiente',
      );
    }

    return this.iniciativaRepository.setEstado(id, false);
  }
}
