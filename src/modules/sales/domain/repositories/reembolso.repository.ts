import { EstadoReembolso } from '../enums';
import { PaginatedResult } from './types/pagination.types';
import {
  CambioEstadoReembolso,
  CodigoReembolsoReservado,
  CrearSolicitudReembolsoParams,
  ListReembolsosDeClienteParams,
  ListReembolsosParams,
  NotificacionCliente,
  PedidoParaReembolso,
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
  // Portal del cliente (HU-B-014).
  abstract findPedidoParaReembolso(
    pedidoId: number,
  ): Promise<PedidoParaReembolso | null>;
  // Reserva el id de la solicitud y arma su código SOL-000001 a partir de él.
  abstract reservarCodigo(): Promise<CodigoReembolsoReservado>;
  // Registra la solicitud pendiente con el id reservado. Si el pago ya tiene
  // una solicitud (también en carrera) lanza ResourceConflictError.
  abstract crearSolicitud(
    params: CrearSolicitudReembolsoParams,
  ): Promise<ReembolsoConPedido>;
  abstract findManyDeCliente(
    clienteId: string,
    params: ListReembolsosDeClienteParams,
  ): Promise<PaginatedResult<ReembolsoConPedido>>;
  // null si no existe o es de otro cliente.
  abstract findByIdDeCliente(
    id: number,
    clienteId: string,
  ): Promise<ReembolsoConPedido | null>;
}
