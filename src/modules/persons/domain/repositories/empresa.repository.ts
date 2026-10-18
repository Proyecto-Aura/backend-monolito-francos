import { EmpresaEntity } from '../entities/empresa.entity';
import { PaginatedResult } from './types/pagination.types';
import {
  CreateEmpresaParams,
  ListEmpresasParams,
  UpdateEmpresaParams,
} from './types/empresa-repository.types';

export abstract class EmpresaRepository {
  abstract create(params: CreateEmpresaParams): Promise<EmpresaEntity>;
  abstract findById(id: number): Promise<EmpresaEntity | null>;
  abstract findEmisora(): Promise<EmpresaEntity | null>;
  abstract findMany(
    params: ListEmpresasParams,
  ): Promise<PaginatedResult<EmpresaEntity>>;
  abstract existsByRuc(ruc: string, excludeId?: number): Promise<boolean>;
  abstract existsByEmail(email: string, excludeId?: number): Promise<boolean>;
  abstract update(
    id: number,
    params: UpdateEmpresaParams,
  ): Promise<EmpresaEntity>;
  abstract setStatus(id: number, estado: boolean): Promise<EmpresaEntity>;
}
