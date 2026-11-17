import { PedidoEntity } from '../entities';
import { EstadoPedido } from '../enums';
import { PaginatedResult } from './types/pagination.types';
import {
  ClienteParaPedido,
  ClienteParaResumen,
  CreatePedidoParams,
  IndicadoresPedidosDespacho,
  IndicadoresPedidosInventario,
  ListPedidosParams,
  ListPedidosDeClienteParams,
  NotificacionPedidoParams,
  PedidoDetalle,
  PedidoResumen,
  PedidoResumenPortal,
  PresentacionParaPedido,
} from './types/pedido-repository.types';

export abstract class PedidoRepository {
  abstract findClienteParaPedido(
    clienteId: string,
  ): Promise<ClienteParaPedido | null>;
  // Cliente vinculado al usuario del portal (User -> Persona -> Cliente).
  abstract findClienteParaResumenPorUser(
    userId: string,
  ): Promise<ClienteParaResumen | null>;
  abstract findPresentacionesParaPedido(
    ids: number[],
  ): Promise<PresentacionParaPedido[]>;
  // Crea el pedido con sus detalles y su pago en una sola transacción, y le
  // asigna el código PED-000001 a partir de su id (RF-A034).
  abstract create(params: CreatePedidoParams): Promise<PedidoDetalle>;
  // Deja el aviso in-app de pago rechazado al usuario del portal (RF-B26). No
  // crea ningún pedido: un pago rechazado no deja nada guardado (RN5).
  abstract notificarPagoRechazado(
    userId: string,
    notificacion: NotificacionPedidoParams,
  ): Promise<void>;
  abstract findMany(
    params: ListPedidosParams,
  ): Promise<PaginatedResult<PedidoResumen>>;
  abstract findManyDeCliente(
    clienteId: string,
    params: ListPedidosDeClienteParams,
  ): Promise<PaginatedResult<PedidoResumenPortal>>;
  abstract findById(id: number): Promise<PedidoEntity | null>;
  abstract findDetalleById(id: number): Promise<PedidoDetalle | null>;
  // Cambia el estado solo si el pedido sigue en `desde`; devuelve false si en
  // el camino otro usuario ya lo cambió.
  abstract cambiarEstado(
    id: number,
    desde: EstadoPedido,
    hacia: EstadoPedido,
  ): Promise<boolean>;
  // Pasa el pedido de `pendiente_entrega` a `en_camino` y, en la misma
  // transacción, deja la notificación al usuario del cliente (RF-A096, RF-A097).
  // Si el cliente no tiene usuario no hay a quién notificar y se omite. Devuelve
  // false si en el camino otro usuario ya lo cambió.
  abstract marcarEnCamino(
    id: number,
    notificacion: NotificacionPedidoParams,
  ): Promise<boolean>;
  // Pasa el pedido a `entregado` y guarda la fecha de entrega (RF-A098). El
  // stock ya se descontó antes, en `pendiente_entrega` (RF-A036).
  abstract marcarEntregado(id: number): Promise<PedidoEntity>;
  // Conteo de pedidos por preparar, por cada uno de los 3 estados de inventario.
  abstract getIndicadoresInventario(): Promise<IndicadoresPedidosInventario>;
  // Conteo de pedidos de despacho, por cada uno de sus 3 estados.
  abstract getIndicadoresDespacho(): Promise<IndicadoresPedidosDespacho>;
}
