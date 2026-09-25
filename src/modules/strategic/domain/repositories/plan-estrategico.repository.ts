import { PaginatedResult } from './types/pagination.types';
import {
  CreatePlanEstrategicoParams,
  ListPlanesEstrategicosParams,
  PlanEstrategicoEntityConEstado,
} from './types/plan-estrategico-repository.types';

export abstract class PlanEstrategicoRepository {
  abstract create(
    params: CreatePlanEstrategicoParams,
  ): Promise<PlanEstrategicoEntityConEstado>;
  abstract findById(id: number): Promise<PlanEstrategicoEntityConEstado | null>;
  abstract findMany(
    params: ListPlanesEstrategicosParams,
  ): Promise<PaginatedResult<PlanEstrategicoEntityConEstado>>;
  abstract existsByName(nombre: string): Promise<boolean>;
  abstract updateEstado(
    id: number,
    nuevoEstadoPlanId: number,
  ): Promise<PlanEstrategicoEntityConEstado>;
}
