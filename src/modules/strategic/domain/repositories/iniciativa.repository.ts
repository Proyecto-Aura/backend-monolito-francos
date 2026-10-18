import {
  CreateIniciativaParams,
  IniciativaEntityEnriquecido,
  ListIniciativasPorObjetivoParams,
  UpdateIniciativaParams,
} from './types/iniciativa-repository.types';
import { PaginatedResult } from './types/pagination.types';

export abstract class IniciativaRepository {
  abstract findById(id: number): Promise<IniciativaEntityEnriquecido | null>;
  abstract create(
    params: CreateIniciativaParams,
    codigoPlan: string,
    correlativo: string,
  ): Promise<IniciativaEntityEnriquecido>;
  abstract existsByNombre(
    objetivoEstrategicoId: number,
    nombre: string,
    excludeId?: number,
  ): Promise<boolean>;
  abstract update(
    id: number,
    params: UpdateIniciativaParams,
  ): Promise<IniciativaEntityEnriquecido>;
  abstract setEstado(
    id: number,
    estado: boolean,
  ): Promise<IniciativaEntityEnriquecido>;
  abstract updateEstadoIniciativa(
    id: number,
    estadoIniciativaId: number,
    motivoCancelacion?: string,
  ): Promise<IniciativaEntityEnriquecido>;
  abstract countByPlanYTipo(
    planId: number,
    tipoModuloId: number,
  ): Promise<number>;
  abstract findByObjetivo(
    params: ListIniciativasPorObjetivoParams,
  ): Promise<PaginatedResult<IniciativaEntityEnriquecido>>;
  abstract findResumenPorPlan(
    planId: number,
    tipoModuloId: number,
  ): Promise<IniciativaEntityEnriquecido[]>;
}
