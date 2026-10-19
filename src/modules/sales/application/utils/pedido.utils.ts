import { InvalidRequestError } from '../../domain/errors/sales-domain.errors';
import { PresentacionParaPedido } from '../../domain/repositories/types/pedido-repository.types';

// Lima no tiene horario de verano: siempre está en UTC-5.
const OFFSET_LIMA = '-05:00';

// RF-A034: PED-000001, a partir del id del pedido.
export function formatCodigoPedido(id: number): string {
  return `PED-${String(id).padStart(6, '0')}`;
}

// RN17: se cobra el precio mayorista cuando la cantidad supera el umbral de la
// presentación. Sin precio o sin umbral mayorista, se cobra el unitario.
export function precioAplicado(
  presentacion: PresentacionParaPedido,
  cantidad: number,
): number {
  const { precio_mayorista, umbral_mayorista } = presentacion;

  if (
    precio_mayorista !== null &&
    umbral_mayorista !== null &&
    cantidad > umbral_mayorista
  ) {
    return precio_mayorista;
  }

  return presentacion.precio_unitario;
}

// Los montos se suman en céntimos para no arrastrar errores de coma flotante.
const aCentimos = (monto: number): number => Math.round(monto * 100);

export function calcularLinea(
  presentacion: PresentacionParaPedido,
  cantidad: number,
): { precio_unitario: number; precio_aplicado: number; subtotal: number } {
  const aplicado = precioAplicado(presentacion, cantidad);

  return {
    precio_unitario: presentacion.precio_unitario,
    precio_aplicado: aplicado,
    subtotal: (aCentimos(aplicado) * cantidad) / 100,
  };
}

// RF-A033: el total es la suma de los subtotales de los ítems.
export function calcularTotal(subtotales: number[]): number {
  return (
    subtotales.reduce(
      (acumulado, subtotal) => acumulado + aCentimos(subtotal),
      0,
    ) / 100
  );
}

// RF-A037: convierte fechas YYYY-MM-DD de Lima en un rango sobre created_at,
// con `desde` inclusivo y `hasta` exclusivo (el día siguiente a las 00:00).
export function rangoFechasLima(
  fechaDesde?: string,
  fechaHasta?: string,
): { desde?: Date; hasta?: Date } {
  const desde = fechaDesde
    ? new Date(`${fechaDesde}T00:00:00.000${OFFSET_LIMA}`)
    : undefined;

  let hasta: Date | undefined;
  if (fechaHasta) {
    hasta = new Date(`${fechaHasta}T00:00:00.000${OFFSET_LIMA}`);
    hasta.setUTCDate(hasta.getUTCDate() + 1);
  }

  if (desde && hasta && desde >= hasta) {
    throw new InvalidRequestError(
      'La fecha desde no puede ser posterior a la fecha hasta',
    );
  }

  return { desde, hasta };
}
