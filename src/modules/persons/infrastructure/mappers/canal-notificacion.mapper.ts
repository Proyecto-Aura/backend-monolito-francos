import { CanalNotificacion as PrismaCanalNotificacion } from '@prisma/client';
import { CanalNotificacionEntity } from '../../domain/entities/canal-notificacion.entity';
import { CanalNotificacionTipo } from '../../domain/enums/persons.enums';

export class CanalNotificacionMapper {
  static toDomain(canal: PrismaCanalNotificacion): CanalNotificacionEntity {
    return new CanalNotificacionEntity(
      canal.id,
      canal.tipo as CanalNotificacionTipo,
      canal.activo,
      canal.destinatarios,
      canal.updated_at,
    );
  }
}
