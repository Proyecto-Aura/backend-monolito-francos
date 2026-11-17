import { NotificacionEntity } from '../../entities';
import { PaginationParams } from './pagination.types';

export interface ListNotificacionesParams extends PaginationParams {
  leido?: boolean;
}

export interface NotificacionDeUsuario {
  notificacion: NotificacionEntity;
  leido: boolean;
  fecha_leido: Date | null;
}

export interface PreferenciasNotificacion {
  pedido_en_camino: boolean;
}
