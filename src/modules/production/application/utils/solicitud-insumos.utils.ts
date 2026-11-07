import { DisponibilidadSolicitudInsumos } from '../../domain/repositories/types/solicitud-insumos-repository.types';

export type { DisponibilidadSolicitudInsumos };

// Vista de inventario ("Registrar entrega"): completo si TODAS las líneas
// alcanzan, sin_stock si NINGUNA alcanza, parcial en cualquier otro caso.
// Mismo criterio que calcularDisponibilidad en sales/application/utils/pedido.utils.ts.
export function calcularDisponibilidadInsumos(
  items: Array<{ stock_disponible: number; cantidad_solicitada: number }>,
): DisponibilidadSolicitudInsumos {
  const conStockSuficiente = items.filter(
    (item) => item.stock_disponible >= item.cantidad_solicitada,
  ).length;

  if (conStockSuficiente === items.length) return 'completo';
  if (conStockSuficiente === 0) return 'sin_stock';
  return 'parcial';
}
