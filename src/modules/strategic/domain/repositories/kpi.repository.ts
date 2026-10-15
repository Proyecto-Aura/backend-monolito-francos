import {
  CreateKpiParams,
  KpiEntityEnriquecido,
  ListKpisPorObjetivoParams,
} from './types/kpi-repository.types';
import { PaginatedResult } from './types/pagination.types';

export abstract class KpiRepository {
  abstract create(
    params: CreateKpiParams,
    codigoPlan: string,
    correlativo: string,
  ): Promise<KpiEntityEnriquecido>;
  abstract existsByNombre(
    objetivoEstrategicoId: number,
    nombre: string,
  ): Promise<boolean>;
  abstract countByPlanYTipo(
    planId: number,
    tipoModuloId: number,
  ): Promise<number>;
  abstract findByObjetivo(
    params: ListKpisPorObjetivoParams,
  ): Promise<PaginatedResult<KpiEntityEnriquecido>>;
}
