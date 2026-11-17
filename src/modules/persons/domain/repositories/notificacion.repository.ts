import { PaginatedResult } from './types/pagination.types';
import {
  ListNotificacionesParams,
  NotificacionDeUsuario,
  PreferenciasNotificacion,
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
  abstract findPreferencias(
    userId: string,
  ): Promise<PreferenciasNotificacion | null>;
  abstract actualizarPreferencias(
    userId: string,
    preferencias: PreferenciasNotificacion,
  ): Promise<boolean>;
}
