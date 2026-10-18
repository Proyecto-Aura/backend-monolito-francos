import { EstadoIniciativaEntity, IniciativaEntity } from '../../entities';
import { PaginationParams } from './pagination.types';

export interface CreateIniciativaParams {
  objetivo_estrategico_id: number;
  nombre: string;
  descripcion?: string;
  presupuesto?: number;
  responsable: string;
  fecha_inicio: Date;
  fecha_fin: Date;
}

export interface UpdateIniciativaParams {
  objetivo_estrategico_id?: number;
  nombre?: string;
  descripcion?: string;
  presupuesto?: number;
  responsable?: string;
  fecha_inicio?: Date;
  fecha_fin?: Date;
}

export interface ListIniciativasPorObjetivoParams extends PaginationParams {
  objetivo_estrategico_id: number;
  search?: string;
}

export interface IniciativaObjetivoResumen {
  id: number;
  codigo: string;
  nombre: string;
  responsable: string;
  perspectiva_bsc: {
    id: number;
    nombre: string;
  };
}

export interface IniciativaEntityEnriquecido extends IniciativaEntity {
  estado_iniciativa: EstadoIniciativaEntity;
  objetivo_estrategico: IniciativaObjetivoResumen;
}
