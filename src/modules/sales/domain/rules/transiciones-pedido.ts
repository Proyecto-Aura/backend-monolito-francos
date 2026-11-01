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

// RN6: estados que ve el operario de productos terminados ("pedidos por
// preparar"). Los demás son de ventas o de despacho.
export const ESTADOS_DE_INVENTARIO = [
  EstadoPedido.EN_ESPERA_INVENTARIO,
  EstadoPedido.EN_PREPARACION,
  EstadoPedido.PENDIENTE_ENTREGA,
] as const;

export type EstadoDeInventario = (typeof ESTADOS_DE_INVENTARIO)[number];

export function esEstadoDeInventario(estado: EstadoPedido): boolean {
  return (ESTADOS_DE_INVENTARIO as readonly EstadoPedido[]).includes(estado);
}

// RN6: inventario empieza a preparar el pedido y luego lo deja listo para
// que despacho lo recoja.
export const TRANSICIONES_DE_INVENTARIO: Partial<
  Record<EstadoPedido, EstadoPedido[]>
> = {
  [EstadoPedido.EN_ESPERA_INVENTARIO]: [EstadoPedido.EN_PREPARACION],
  [EstadoPedido.EN_PREPARACION]: [EstadoPedido.PENDIENTE_ENTREGA],
};

export function esTransicionDeInventario(
  desde: EstadoPedido,
  hacia: EstadoPedido,
): boolean {
  return TRANSICIONES_DE_INVENTARIO[desde]?.includes(hacia) ?? false;
}
