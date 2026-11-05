import { InvalidRequestError } from '../../../catalog/domain/errors/catalog-domain.errors';

// Lima no tiene horario de verano: siempre está en UTC-5.
const OFFSET_LIMA = '-05:00';

// Convierte fechas YYYY-MM-DD de Lima en un rango sobre una columna DateTime,
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

// "Hoy" en calendario de Lima, como medianoche-Lima expresada en UTC. new
// Date() directo truncado a una columna @db.Date usa el día UTC, que ya es
// mañana en Lima entre las 19:00 y medianoche (UTC-5) — por eso una solicitud
// creada un día X queda con fecha_creacion = X+1 si no se usa esto.
export function hoyLima(): Date {
  const ahoraLima = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const fechaLima = ahoraLima.toISOString().slice(0, 10);
  return new Date(`${fechaLima}T00:00:00.000${OFFSET_LIMA}`);
}
