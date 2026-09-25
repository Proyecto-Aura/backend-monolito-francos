import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import { PlanEstrategicoEntityConEstado } from '../../domain/repositories/types/plan-estrategico-repository.types';

export class PlanEstrategicoPresenter {
  static toHttp(plan: PlanEstrategicoEntityConEstado) {
    return {
      id: plan.id,
      codigo: plan.codigo,
      nombre: plan.nombre,
      descripcion: plan.descripcion,
      anio_inicio: plan.anio_inicio,
      anio_fin: plan.anio_fin,
      estado_plan_id: plan.estado_plan_id,
      estado: plan.estado,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
      estado_plan: {
        codigo: plan.estado_plan.codigo,
        nombre: plan.estado_plan.nombre,
      },
    };
  }

  static paginatedToHttp(
    result: PaginatedResult<PlanEstrategicoEntityConEstado>,
  ) {
    return {
      data: result.data.map((plan) => this.toHttp(plan)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
