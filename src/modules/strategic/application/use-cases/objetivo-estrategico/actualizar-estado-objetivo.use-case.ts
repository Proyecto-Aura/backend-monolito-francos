import { Injectable } from '@nestjs/common';
import { UpdateEstadoObjetivoDto } from '../../dto/objetivo-estrategico-dtos/update-estado-objetivo.dto';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { EstadoObjetivoRepository } from '../../../domain/repositories/estado-objetivo.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';

const TRANSICIONES: Record<string, string[]> = {
  PENDIENTE: ['EN_PROCESO', 'CANCELADO'],
  EN_PROCESO: ['CUMPLIDO', 'CANCELADO'],
  CUMPLIDO: [],
  CANCELADO: [],
};

@Injectable()
export class ActualizarEstadoObjetivoUseCase {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly estadoObjetivoRepository: EstadoObjetivoRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdateEstadoObjetivoDto,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido> {
    const objetivo = await this.objetivoEstrategicoRepository.findById(id);

    if (!objetivo) {
      throw new ResourceNotFoundError('Objetivo estratégico no encontrado');
    }

    const plan = await this.planEstrategicoRepository.findById(
      objetivo.plan_estrategico_id,
    );

    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }

    if (plan.estado_plan.codigo !== 'ACTIVO') {
      throw new ResourceConflictError(
        'Solo se puede actualizar el estado de avance cuando el plan está Activo',
      );
    }

    const transicionesPermitidas =
      TRANSICIONES[objetivo.estado_objetivo.codigo] ?? [];

    if (!transicionesPermitidas.includes(dto.estado_codigo)) {
      throw new ResourceConflictError('Transición de estado no permitida');
    }

    const nuevoEstado = await this.estadoObjetivoRepository.findByCodigo(
      dto.estado_codigo,
    );

    if (!nuevoEstado) {
      throw new ResourceNotFoundError('Estado de objetivo no encontrado');
    }

    return this.objetivoEstrategicoRepository.updateEstadoObjetivo(
      id,
      nuevoEstado.id,
    );
  }
}
