import { KpiValorEntity, PeriodoEntity } from '../../entities';

export interface UpsertKpiValorParams {
  kpi_id: number;
  anio: number;
  periodo_id: number;
  valor: number;
  semaforo_color: string;
}

export interface KpiValorEntityEnriquecido extends KpiValorEntity {
  periodo: PeriodoEntity;
  color_hex: string;
}
