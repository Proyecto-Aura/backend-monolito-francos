import { EmpleadoEntity } from '../../domain/entities/empleado.entity';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class EmpleadoPresenter {
  static toHttp(empleado: EmpleadoEntity) {
    return {
      id: empleado.id,
      persona_id: empleado.persona_id,
      cargo: empleado.cargo,
      area: empleado.area,
      fecha_ingreso: empleado.fecha_ingreso,
      fecha_des_lab: empleado.fecha_des_lab,
      estado: empleado.estado,
      created_at: empleado.created_at,
      updated_at: empleado.updated_at,
    };
  }
  static paginatedToHttp(result: PaginatedResult<EmpleadoEntity>) {
    return {
      data: result.data.map((empleado) => this.toHttp(empleado)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
