import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { EstadoPlanEstrategicoRepository } from '../../../domain/repositories/estado-plan-estrategico.repository';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';

@Injectable()
export class ActivarPlanEstrategicoUseCase {
  constructor(
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly estadoPlanEstrategicoRepository: EstadoPlanEstrategicoRepository,
    private readonly kpiRepository: KpiRepository,
  ) {}

  async execute(id: number): Promise<PlanEstrategicoEntityConEstado> {
    const plan = await this.planEstrategicoRepository.findActivoById(id);

    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }

    if (plan.estado_plan.codigo !== 'BORRADOR') {
      throw new ResourceConflictError(
        'Solo un plan en Borrador puede activarse',
      );
    }

    const incompleto = await this.kpiRepository.existeKpiIncompletoEnPlan(
      id,
      plan.anio_inicio,
      plan.anio_fin,
    );

    if (incompleto) {
      throw new ResourceConflictError(
        'No se puede activar el plan: hay KPIs sin meta o semáforo configurado para todos los años del plan',
      );
    }

    const estadoActivo =
      await this.estadoPlanEstrategicoRepository.findByCodigo('ACTIVO');

    if (!estadoActivo) {
      throw new ResourceNotFoundError('Estado de plan ACTIVO no encontrado');
    }

    try {
      return await this.planEstrategicoRepository.updateEstado(
        id,
        estadoActivo.id,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ResourceConflictError(
          'Ya existe un plan activo. Cierra el plan activo actual antes de activar uno nuevo.',
        );
      }

      throw error;
    }
  }
}
