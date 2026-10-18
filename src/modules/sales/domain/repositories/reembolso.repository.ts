import { EstadoReembolso } from '../enums';
import { PaginatedResult } from './types/pagination.types';
import {
  CambioEstadoReembolso,
  ListReembolsosParams,
  NotificacionCliente,
  ReembolsoConPedido,
} from './types/reembolso-repository.types';

export abstract class ReembolsoRepository {
  abstract findMany(
    params: ListReembolsosParams,
  ): Promise<PaginatedResult<ReembolsoConPedido>>;
  abstract findById(id: number): Promise<ReembolsoConPedido | null>;
  // Cambia el estado solo si la solicitud sigue en `desde` y, en la misma
  // transacción, deja la notificación al cliente si tiene usuario (RF-A045).
  // Devuelve false si en el camino otro usuario ya la cambió.
  abstract cambiarEstado(
    id: number,
    desde: EstadoReembolso,
    cambio: CambioEstadoReembolso,
    notificacion: NotificacionCliente,
  ): Promise<boolean>;
}
