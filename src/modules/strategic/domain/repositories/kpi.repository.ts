import {
  CreateKpiParams,
  KpiEntityEnriquecido,
  KpiResumenPlanEntidad,
  KpiSeguimientoEntidad,
  ListKpisPorObjetivoParams,
  UpdateKpiParams,
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
    excludeId?: number,
  ): Promise<boolean>;
  abstract update(
    id: number,
    params: UpdateKpiParams,
  ): Promise<KpiEntityEnriquecido>;
  abstract setEstado(
    id: number,
    estado: boolean,
  ): Promise<KpiEntityEnriquecido>;
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
  abstract findParaTableroControl(
    planId: number,
    tipoModuloId: number,
  ): Promise<KpiEntityEnriquecido[]>;
  abstract findSeguimientoPorPlan(
    planId: number,
    tipoModuloId: number,
  ): Promise<KpiSeguimientoEntidad[]>;
  abstract existeKpiIncompletoEnPlan(
    planId: number,
    anioInicio: number,
    anioFin: number,
  ): Promise<boolean>;
}
