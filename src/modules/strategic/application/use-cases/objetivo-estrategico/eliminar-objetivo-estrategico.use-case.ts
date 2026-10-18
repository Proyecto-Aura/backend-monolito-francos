import { Injectable } from '@nestjs/common';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';

@Injectable()
export class EliminarObjetivoEstrategicoUseCase {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
  ) {}

  async execute(id: number): Promise<ObjetivoEstrategicoEntityEnriquecido> {
    const objetivo =
      await this.objetivoEstrategicoRepository.findActivoById(id);

    const tipoModulo = await this.tipoModuloRepository.findByCodigo('NEG');

    if (!objetivo || !tipoModulo || objetivo.tipo_modulo_id !== tipoModulo.id) {
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
        'Solo se pueden eliminar objetivos cuando el plan está en Borrador',
      );
    }

    const tieneDependencias =
      await this.objetivoEstrategicoRepository.tieneKpisORelacionesActivas(id);

    if (tieneDependencias) {
      throw new ResourceConflictError(
        'No se puede eliminar un objetivo con KPIs, iniciativas o relaciones asociadas',
      );
    }

    return this.objetivoEstrategicoRepository.setEstado(id, false);
  }
}
