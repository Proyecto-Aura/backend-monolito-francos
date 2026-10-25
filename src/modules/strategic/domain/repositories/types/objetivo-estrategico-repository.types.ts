import {
  EstadoObjetivoEntity,
  ObjetivoEstrategicoEntity,
  PerspectivaBscEntity,
  RelacionOeEntity,
} from '../../entities';
import { PaginationParams } from './pagination.types';

export interface CreateObjetivoEstrategicoParams {
  plan_estrategico_id: number;
  perspectiva_bsc_id: number;
  responsable: string;
  nombre: string;
  descripcion: string | null;
  relaciones_destino_ids: number[];
  oe_negocio_id?: number;
}

export interface UpdateObjetivoEstrategicoParams {
  perspectiva_bsc_id?: number;
  responsable?: string;
  nombre?: string;
  descripcion?: string | null;
  relaciones_destino_ids?: number[];
  oe_negocio_id?: number;
}

export interface ListObjetivosEstrategicosParams extends PaginationParams {
  plan_estrategico_id: number;
  tipo_modulo_id: number;
  perspectiva_bsc_id?: number;
  search?: string;
}

export interface ObjetivoEstrategicoEntityEnriquecido extends ObjetivoEstrategicoEntity {
  perspectiva_bsc: PerspectivaBscEntity;
  estado_objetivo: EstadoObjetivoEntity;
  relaciones_como_origen: RelacionOeEntity[];
  oe_negocio: { id: number; codigo: string; nombre: string } | null;
}
