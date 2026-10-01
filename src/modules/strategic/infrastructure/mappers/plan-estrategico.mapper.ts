import { Prisma } from '@prisma/client';
import { PlanEstrategicoEntity } from '../../domain/entities';
import { PlanEstrategicoEntityConEstado } from '../../domain/repositories/types/plan-estrategico-repository.types';
import { EstadoPlanEstrategicoMapper } from './estado-plan-estrategico.mapper';

type PrismaPlanEstrategicoConEstado = Prisma.PlanEstrategicoGetPayload<{
  include: { estado_plan: true };
}>;

export class PlanEstrategicoMapper {
  static toDomain(
    plan: PrismaPlanEstrategicoConEstado,
  ): PlanEstrategicoEntityConEstado {
    return Object.assign(
      new PlanEstrategicoEntity(
        plan.id,
        plan.codigo,
        plan.nombre,
        plan.descripcion,
        plan.anio_inicio,
        plan.anio_fin,
        plan.estado_plan_id,
        plan.estado,
        plan.created_at,
        plan.updated_at,
      ),
      {
        estado_plan: EstadoPlanEstrategicoMapper.toDomain(plan.estado_plan),
      },
    );
  }
}
