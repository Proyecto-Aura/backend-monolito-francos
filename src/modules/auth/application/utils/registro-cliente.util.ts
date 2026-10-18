import {
  TipoCliente,
  TipoDocumento,
} from '../../../persons/domain/enums/persons.enums';

/**
 * HU-B-002 (RF-B06): el tipo de documento decide qué datos se piden. DNI, CE,
 * pasaporte y RUC 10 son personas naturales; RUC 20, empresas. Devuelve null
 * con un RUC que no empieza en 10 ni en 20.
 */
export function tipoClienteSegunDocumento(
  tipoDocumento: TipoDocumento,
  numeroDocumento: string,
): TipoCliente | null {
  if (tipoDocumento !== TipoDocumento.RUC) {
    return TipoCliente.PERSONA_NATURAL;
  }
  if (numeroDocumento.startsWith('10')) {
    return TipoCliente.PERSONA_NATURAL;
  }
  if (numeroDocumento.startsWith('20')) {
    return TipoCliente.EMPRESA;
  }
  return null;
}

// La fecha llega como YYYY-MM-DD (o ISO); se compara con el día de hoy en Lima.
export function esFechaFutura(fecha: string, ahora = new Date()): boolean {
  const hoyLima = ahora.toLocaleDateString('en-CA', {
    timeZone: 'America/Lima',
  });
  return fecha.slice(0, 10) > hoyLima;
}
