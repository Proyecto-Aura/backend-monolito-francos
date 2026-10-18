import { PedidoEntity } from '../entities';
import { PaginatedResult } from './types/pagination.types';
import {
  ClienteParaPedido,
  CreatePedidoParams,
  ListPedidosParams,
  PedidoDetalle,
  PedidoResumen,
  PresentacionParaPedido,
} from './types/pedido-repository.types';

export abstract class PedidoRepository {
  abstract findClienteParaPedido(
    clienteId: string,
  ): Promise<ClienteParaPedido | null>;
  abstract findPresentacionesParaPedido(
    ids: number[],
  ): Promise<PresentacionParaPedido[]>;
  // Crea el pedido con sus detalles y su pago en una sola transacción, y le
  // asigna el código PED-000001 a partir de su id (RF-A034).
  abstract create(params: CreatePedidoParams): Promise<PedidoDetalle>;
  abstract findMany(
    params: ListPedidosParams,
  ): Promise<PaginatedResult<PedidoResumen>>;
  abstract findById(id: number): Promise<PedidoEntity | null>;
  abstract findDetalleById(id: number): Promise<PedidoDetalle | null>;
  // Pasa el pedido a `entregado` y descuenta el stock de cada presentación en la
  // misma transacción (RF-A036). Falla si alguna no tiene stock suficiente.
  abstract marcarEntregado(id: number): Promise<PedidoEntity>;
}
