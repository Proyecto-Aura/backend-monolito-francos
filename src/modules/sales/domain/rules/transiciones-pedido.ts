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
