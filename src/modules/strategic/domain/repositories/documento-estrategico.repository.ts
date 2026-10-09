import { DocumentoEstrategicoEntity } from '../entities';
import { PaginatedResult } from './types/pagination.types';
import {
  CreateDocumentoEstrategicoParams,
  ListDocumentosEstrategicosParams,
} from './types/documento-estrategico-repository.types';

export abstract class DocumentoEstrategicoRepository {
  abstract create(
    params: CreateDocumentoEstrategicoParams,
    tipoModuloId: number,
  ): Promise<DocumentoEstrategicoEntity>;
  abstract findActivoById(
    id: number,
  ): Promise<DocumentoEstrategicoEntity | null>;
  abstract findById(id: number): Promise<DocumentoEstrategicoEntity | null>;
  abstract findMany(
    params: ListDocumentosEstrategicosParams,
  ): Promise<PaginatedResult<DocumentoEstrategicoEntity>>;
  abstract findManyIncluyendoInactivos(
    params: ListDocumentosEstrategicosParams,
  ): Promise<PaginatedResult<DocumentoEstrategicoEntity>>;
  abstract existsByName(
    planId: number,
    tipoModuloId: number,
    nombre: string,
  ): Promise<boolean>;
  abstract setEstado(
    id: number,
    estado: boolean,
  ): Promise<DocumentoEstrategicoEntity>;
}
