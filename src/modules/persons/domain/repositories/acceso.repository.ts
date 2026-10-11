import { AccesoEntity } from '../entities/acceso.entity';
import { CreateAccesoParams } from './types/acceso-repository.types';

export abstract class AccesoRepository {
  abstract create(params: CreateAccesoParams): Promise<AccesoEntity>;

  abstract findByRoleAndRoute(
    rolId: number,
    rutaId: number,
  ): Promise<AccesoEntity | null>;

  abstract findByRoleId(rolId: number): Promise<AccesoEntity[]>;

  abstract findByRouteId(rutaId: number): Promise<AccesoEntity[]>;

  abstract setStatus(id: number, estado: boolean): Promise<AccesoEntity>;

  /**
   * IDs de ruta activos a los que tiene acceso cualquiera de los roles dados (por nombre).
   * Se busca por nombre, no por id, porque el JWT solo trae nombres de rol.
   */
  abstract findActiveRutaIdsByRoleNames(roleNames: string[]): Promise<number[]>;
}
