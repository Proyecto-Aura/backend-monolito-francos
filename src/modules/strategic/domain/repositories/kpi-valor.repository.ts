import {
  KpiValorEntityEnriquecido,
  UpsertKpiValorParams,
} from './types/kpi-valor-repository.types';

export abstract class KpiValorRepository {
  abstract existsActivosByKpi(kpiId: number): Promise<boolean>;
  abstract upsert(
    params: UpsertKpiValorParams,
  ): Promise<KpiValorEntityEnriquecido>;
  abstract findHistorialByKpi(
    kpiId: number,
  ): Promise<KpiValorEntityEnriquecido[]>;
  abstract findUltimoByKpi(
    kpiId: number,
  ): Promise<KpiValorEntityEnriquecido | null>;
}
