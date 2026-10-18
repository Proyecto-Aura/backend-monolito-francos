import {
  CORRELATIVO_MAXIMO,
  SERIE_FORMATO,
} from '../../../domain/entities/serie-comprobante.entity';
import { TipoComprobante } from '../../../domain/enums/sales.enums';
import { InvalidSerieComprobanteError } from '../../../domain/errors/sales-domain.errors';

export const UMBRAL_ALERTA_POR_DEFECTO = 100;

export function assertSerieCoincideConTipo(
  tipo: TipoComprobante,
  serie: string,
): void {
  if (!SERIE_FORMATO[tipo].test(serie)) {
    const prefijo = tipo === TipoComprobante.BOLETA ? 'B' : 'F';
    throw new InvalidSerieComprobanteError(
      `La serie de una ${tipo} debe empezar por ${prefijo} seguida de 3 letras mayúsculas o dígitos`,
    );
  }
}

export function assertRangoValido(inicio: number, fin: number): void {
  if (inicio < 1 || fin > CORRELATIVO_MAXIMO || inicio > fin) {
    throw new InvalidSerieComprobanteError(
      `El rango debe cumplir 1 <= correlativo_inicio <= correlativo_fin <= ${CORRELATIVO_MAXIMO}`,
    );
  }
}
