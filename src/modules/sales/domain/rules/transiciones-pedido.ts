import { EstadoPedido } from '../enums';

// RN6: cambios de estado que hace el operador de ventas. Pasa el pedido a
// "en espera de inventario" para que el operador de productos terminados lo vea
// (HU-A-010, RF-A038).
export const TRANSICIONES_DE_VENTAS: Partial<
  Record<EstadoPedido, EstadoPedido[]>
> = {
  [EstadoPedido.CONFIRMADO]: [EstadoPedido.EN_ESPERA_INVENTARIO],
};

export function esTransicionDeVentas(
  desde: EstadoPedido,
  hacia: EstadoPedido,
): boolean {
  return TRANSICIONES_DE_VENTAS[desde]?.includes(hacia) ?? false;
}

// RN6: estados que ve el operador de despacho (HU-A-023, RF-A094). Los demás
// son de ventas o de inventario.
export const ESTADOS_DE_DESPACHO = [
  EstadoPedido.PENDIENTE_ENTREGA,
  EstadoPedido.EN_CAMINO,
  EstadoPedido.ENTREGADO,
] as const;

export type EstadoDeDespacho = (typeof ESTADOS_DE_DESPACHO)[number];

export function esEstadoDeDespacho(estado: EstadoPedido): boolean {
  return (ESTADOS_DE_DESPACHO as readonly EstadoPedido[]).includes(estado);
}

// RN6: despacho saca el pedido a reparto y después lo marca como entregado
// (RF-A096, RF-A098).
export const TRANSICIONES_DE_DESPACHO: Partial<
  Record<EstadoPedido, EstadoPedido[]>
> = {
  [EstadoPedido.PENDIENTE_ENTREGA]: [EstadoPedido.EN_CAMINO],
  [EstadoPedido.EN_CAMINO]: [EstadoPedido.ENTREGADO],
};

export function esTransicionDeDespacho(
  desde: EstadoPedido,
  hacia: EstadoPedido,
): boolean {
  return TRANSICIONES_DE_DESPACHO[desde]?.includes(hacia) ?? false;
}
