import { TipoPromocion } from '../../domain/enums';

// Lo mínimo de una promoción que hace falta para calcular el precio y
// describirla.
export interface PromocionAplicable {
  tipo: TipoPromocion;
  nombre: string;
  valor: number;
  cantidad_paga: number | null;
  cantidad_lleva: number | null;
}

// Se trabaja en céntimos para no arrastrar errores de coma flotante.
const aCentimos = (monto: number): number => Math.round(monto * 100);

// Precio que paga el cliente por una unidad con la promoción vigente (RF-A022).
// Solo `porcentaje` y `monto_fijo` cambian el precio unitario; `nxm` y
// `regalo` se aplican sobre la cantidad, así que el precio no cambia. Se
// redondea a 2 decimales y nunca baja de 0.
export function calcularPrecioFinal(
  precio: number,
  promocion: PromocionAplicable | null,
): number {
  const precioCentimos = aCentimos(precio);
  let finalCentimos = precioCentimos;

  if (promocion?.tipo === TipoPromocion.PORCENTAJE) {
    finalCentimos = Math.round(
      (precioCentimos * (100 - promocion.valor)) / 100,
    );
  } else if (promocion?.tipo === TipoPromocion.MONTO_FIJO) {
    finalCentimos = precioCentimos - aCentimos(promocion.valor);
  }

  return Math.max(0, finalCentimos) / 100;
}

// Texto corto para mostrar la promoción en el catálogo ("10% de descuento",
// "2x1"...). Si faltan datos para armarlo, se usa el nombre de la promoción.
export function describirPromocion(promocion: PromocionAplicable): string {
  switch (promocion.tipo) {
    case TipoPromocion.PORCENTAJE:
      return `${promocion.valor}% de descuento`;
    case TipoPromocion.MONTO_FIJO:
      return `S/ ${promocion.valor.toFixed(2)} de descuento`;
    case TipoPromocion.NXM:
      return promocion.cantidad_lleva && promocion.cantidad_paga
        ? `${promocion.cantidad_lleva}x${promocion.cantidad_paga}`
        : promocion.nombre;
    default:
      return promocion.nombre;
  }
}
