import { ResourceConflictError } from '../../../catalog/domain/errors/catalog-domain.errors';

// Las columnas son DATE: se guardan a medianoche UTC para que la fecha no se
// corra un día al leerla.
export function parseFechaDia(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}

export function validarFechaVencimiento(
  fechaIngreso: Date,
  fechaVencimiento: Date | null,
): void {
  if (fechaVencimiento !== null && fechaVencimiento < fechaIngreso) {
    throw new ResourceConflictError(
      'La fecha de vencimiento no puede ser anterior a la fecha de ingreso',
    );
  }
}
