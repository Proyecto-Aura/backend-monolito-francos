import {
  FrecuenciaMedicionEntity,
  KpiEntity,
  KpiMetaAnualEntity,
  SemaforoConfigEntity,
  UnidadMedidaKpiEntity,
} from '../../entities';
import { PaginationParams } from './pagination.types';

export interface SemaforoAnualInput {
  anio: number;
  meta: number;
  operador_verde: '>=' | '<=';
  operador_amarillo: '>=' | '>' | '<=' | '<' | '=';
  valor_amarillo: number;
}

export interface CreateKpiParams {
  objetivo_estrategico_id: number;
  frecuencia_id: number;
  unidad_medida_id: number;
  nombre: string;
  formula: string;
  metas_por_anio: SemaforoAnualInput[];
}

export interface KpiObjetivoResumen {
  id: number;
  nombre: string;
  perspectiva_bsc: {
    id: number;
    nombre: string;
  };
}

export interface ListKpisPorObjetivoParams extends PaginationParams {
  objetivo_estrategico_id: number;
  search?: string;
}

export interface KpiEntityEnriquecido extends KpiEntity {
  frecuencia: FrecuenciaMedicionEntity;
  unidad_medida: UnidadMedidaKpiEntity;
  metas_anuales: KpiMetaAnualEntity[];
  semaforos: SemaforoConfigEntity[];
  objetivo_estrategico: KpiObjetivoResumen;
}
