import { PaginatedResult } from './types/pagination.types';
import {
  CreatePlanEstrategicoParams,
  ListPlanesEstrategicosParams,
  PlanEstrategicoEntityConEstado,
  UpdatePlanEstrategicoParams,
} from './types/plan-estrategico-repository.types';

export abstract class PlanEstrategicoRepository {
  abstract create(
    params: CreatePlanEstrategicoParams,
  ): Promise<PlanEstrategicoEntityConEstado>;
  abstract findById(id: number): Promise<PlanEstrategicoEntityConEstado | null>;
  abstract findMany(
    params: ListPlanesEstrategicosParams,
  ): Promise<PaginatedResult<PlanEstrategicoEntityConEstado>>;
  abstract findManyIncluyendoInactivos(
    params: ListPlanesEstrategicosParams,
  ): Promise<PaginatedResult<PlanEstrategicoEntityConEstado>>;
  abstract existsByName(nombre: string, excludeId?: number): Promise<boolean>;
  abstract update(
    id: number,
    params: UpdatePlanEstrategicoParams,
  ): Promise<PlanEstrategicoEntityConEstado>;
  abstract setEstado(
    id: number,
    estado: boolean,
  ): Promise<PlanEstrategicoEntityConEstado>;
  abstract updateEstado(
    id: number,
    nuevoEstadoPlanId: number,
  ): Promise<PlanEstrategicoEntityConEstado>;
}
