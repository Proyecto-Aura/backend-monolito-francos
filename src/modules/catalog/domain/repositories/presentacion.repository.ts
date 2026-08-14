import { UnidadMedidaPresentacion } from '@prisma/client';
import { PresentacionEntity } from '../entities';
import { PaginatedResult } from './types/pagination.types';
import {
  CreatePresentacionParams,
  ListPresentacionesParams,
  UpdatePresentacionParams,
} from './types/presentacion-repository.types';

export abstract class PresentacionRepository {
  abstract create(
    params: CreatePresentacionParams,
  ): Promise<PresentacionEntity>;
  abstract findById(id: number): Promise<PresentacionEntity | null>;
  abstract findMany(
    params: ListPresentacionesParams,
  ): Promise<PaginatedResult<PresentacionEntity>>;
  abstract existsByCantidadAndUnidadMedida(
    cantidad: number,
    unida_medida: UnidadMedidaPresentacion,
    excludeId?: number,
  ): Promise<boolean>;
  abstract update(
    id: number,
    params: UpdatePresentacionParams,
  ): Promise<PresentacionEntity>;
  abstract setStatus(id: number, estado: boolean): Promise<PresentacionEntity>;
}
