import { PaginatedResult } from './types/pagination.types';
import { RelacionOeEntity } from '../entities';
import {
  CreateObjetivoEstrategicoParams,
  ListObjetivosEstrategicosParams,
  ObjetivoEstrategicoEntityEnriquecido,
  UpdateObjetivoEstrategicoParams,
} from './types/objetivo-estrategico-repository.types';

export abstract class ObjetivoEstrategicoRepository {
  abstract create(
    params: CreateObjetivoEstrategicoParams,
    tipoModuloId: number,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido>;
  abstract findById(
    id: number,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido | null>;
  abstract findMany(
    params: ListObjetivosEstrategicosParams,
  ): Promise<PaginatedResult<ObjetivoEstrategicoEntityEnriquecido>>;
  abstract existsByName(
    planId: number,
    tipoModuloId: number,
    nombre: string,
    excludeId?: number,
  ): Promise<boolean>;
  abstract update(
    id: number,
    params: UpdateObjetivoEstrategicoParams,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido>;
  abstract setEstado(
    id: number,
    estado: boolean,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido>;
  abstract tieneKpisORelacionesActivas(id: number): Promise<boolean>;
  abstract findRelacionesActivasPorPlanYTipo(
    planId: number,
    tipoModuloId: number,
  ): Promise<{ origen_id: number; destino_id: number }[]>;
  abstract existeRelacionInversa(
    origenId: number,
    destinoId: number,
  ): Promise<boolean>;
  abstract crearRelacion(origenId: number, destinoId: number): Promise<void>;
  abstract findRelacionById(
    relacionId: number,
  ): Promise<RelacionOeEntity | null>;
  abstract eliminarRelacion(relacionId: number): Promise<void>;
  abstract updateEstadoObjetivo(
    id: number,
    nuevoEstadoObjetivoId: number,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido>;
}
