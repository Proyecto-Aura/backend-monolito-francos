import {
  CreateKpiParams,
  KpiEntityEnriquecido,
  KpiResumenPlanEntidad,
  ListKpisPorObjetivoParams,
} from './types/kpi-repository.types';
import { PaginatedResult } from './types/pagination.types';

export abstract class KpiRepository {
  abstract findById(id: number): Promise<KpiEntityEnriquecido | null>;
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
  abstract findResumenPorPlan(
    planId: number,
    tipoModuloId: number,
  ): Promise<KpiResumenPlanEntidad[]>;
}
