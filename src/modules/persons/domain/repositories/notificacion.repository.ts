import { PaginatedResult } from './types/pagination.types';
import {
  ListNotificacionesParams,
  NotificacionDeUsuario,
} from './types/notificacion-repository.types';

export abstract class NotificacionRepository {
  abstract findManyDeUsuario(
    userId: string,
    params: ListNotificacionesParams,
  ): Promise<PaginatedResult<NotificacionDeUsuario>>;
  abstract marcarLeida(
    notificacionId: number,
    userId: string,
  ): Promise<boolean>;
}
