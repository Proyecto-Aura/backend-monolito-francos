import { ResourceConflictError } from '../../domain/errors/catalog-domain.errors';

// La empresa opera en Perú: "hoy" para una promoción es la fecha de Lima, no la
// de UTC (a las 22:00 en Lima ya es el día siguiente en UTC).
const ZONA_HORARIA = 'America/Lima';

const formatoFechaLima = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Fecha de hoy en Lima con formato YYYY-MM-DD.
export function fechaHoy(now: Date = new Date()): string {
  return formatoFechaLima.format(now);
}

// Las columnas fecha_inicio y fecha_fin son DATE: se guardan a medianoche UTC
// para que la fecha no se corra un día al leerla.
export function parseFechaDia(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}

export function formatFechaDia(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function nombrePromocionPorDefecto(valor: number): string {
  return `Descuento ${valor}%`;
}

export function validarRangoFechas(inicio: Date, fin: Date): void {
  if (fin < inicio) {
    throw new ResourceConflictError(
      'La fecha de fin de la promoción no puede ser anterior a la fecha de inicio',
    );
  }
}

interface PromocionConVigencia {
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: boolean;
}

// Vigente: activa y con la fecha de hoy dentro del rango (ambos extremos incluidos).
export function estaVigente(
  promocion: PromocionConVigencia,
  hoy: string = fechaHoy(),
): boolean {
  return (
    promocion.estado &&
    formatFechaDia(promocion.fecha_inicio) <= hoy &&
    hoy <= formatFechaDia(promocion.fecha_fin)
  );
}
