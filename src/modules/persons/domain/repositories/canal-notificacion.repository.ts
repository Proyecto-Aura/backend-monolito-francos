import { CanalNotificacionEntity } from '../entities/canal-notificacion.entity';
import { CanalNotificacionTipo } from '../enums/persons.enums';
import { UpdateCanalNotificacionParams } from './types/canal-notificacion-repository.types';

export abstract class CanalNotificacionRepository {
  abstract findAll(): Promise<CanalNotificacionEntity[]>;
  abstract findByTipo(
    tipo: CanalNotificacionTipo,
  ): Promise<CanalNotificacionEntity | null>;
  abstract update(
    tipo: CanalNotificacionTipo,
    params: UpdateCanalNotificacionParams,
  ): Promise<CanalNotificacionEntity>;
}
