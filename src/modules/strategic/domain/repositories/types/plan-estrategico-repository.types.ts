import {
  EstadoPlanEstrategicoEntity,
  PlanEstrategicoEntity,
} from '../../entities';
import { PaginationParams } from './pagination.types';

export interface CreatePlanEstrategicoParams {
  nombre: string;
  descripcion: string | null;
  anio_inicio: number;
  anio_fin: number;
}

export interface UpdatePlanEstrategicoParams {
  nombre?: string;
  descripcion?: string | null;
  anio_inicio?: number;
  anio_fin?: number;
}

export interface ListPlanesEstrategicosParams extends PaginationParams {
  search?: string;
  estado_codigo?: string;
}

export interface PlanEstrategicoEntityConEstado extends PlanEstrategicoEntity {
  estado_plan: EstadoPlanEstrategicoEntity;
}
