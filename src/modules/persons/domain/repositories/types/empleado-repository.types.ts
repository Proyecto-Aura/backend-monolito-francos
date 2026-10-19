import { PaginationParams } from './pagination.types';
import { AreaEmpleado } from '../../enums/persons.enums';

export interface CreateEmpleadoParams {
  persona_id: string;
  cargo: string | null;
  area: AreaEmpleado | null;
  fecha_ingreso: Date | null;
  fecha_des_lab: Date | null;
  estado: boolean;
}

export interface UpdateEmpleadoParams {
  cargo?: string;
  area?: AreaEmpleado;
  fecha_ingreso?: Date;
  fecha_des_lab?: Date;
}

export interface ListEmpleadosParams extends PaginationParams {
  search?: string;
  estado?: boolean;
}
