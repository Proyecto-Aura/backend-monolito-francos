import {
  Notificacion as PrismaNotificacion,
  NotificacionUser as PrismaNotificacionUser,
} from '@prisma/client';
import { NotificacionEntity } from '../../domain/entities';
import { ReferenciaTipo } from '../../domain/enums/persons.enums';
import { NotificacionDeUsuario } from '../../domain/repositories/types/notificacion-repository.types';

export class NotificacionMapper {
  static toDomain(notificacion: PrismaNotificacion): NotificacionEntity {
    return new NotificacionEntity(
      notificacion.id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.referencia_id,
      notificacion.referencia_tipo as ReferenciaTipo | null,
      notificacion.created_at,
    );
  }

  static toNotificacionDeUsuario(
    fila: PrismaNotificacionUser & { notificacion: PrismaNotificacion },
  ): NotificacionDeUsuario {
    return {
      notificacion: this.toDomain(fila.notificacion),
      leido: fila.leido,
      fecha_leido: fila.fecha_leido,
    };
  }
}
