import { TipoComprobante } from '../../domain/enums';
import { DatosComprobanteDto } from '../dto/pedido-dtos/datos-comprobante.dto';
// Import de solo tipo: evita el ciclo en tiempo de ejecución con
// resumir-pedido-portal.use-case.ts, que a su vez usa esta misma función.
import type { ComprobanteResumen } from '../use-cases/pedido/resumir-pedido-portal.use-case';

// Número de comprobante como lo muestra SUNAT: serie y correlativo de 8 dígitos
// (B001-00000001).
export function codigoComprobante(serie: string, numero: number): string {
  return `${serie}-${String(numero).padStart(8, '0')}`;
}

// RF-B29/RF-A032: boleta por defecto; con factura se exige RUC y razón
// social, con boleta se descartan aunque vengan (el DTO ya los valida solo
// si tipo_comprobante es factura). Mismo criterio para el portal y para el
// registro manual (HU-B-010).
export function comprobanteDesdeDto(
  dto: DatosComprobanteDto | undefined,
): ComprobanteResumen {
  const tipo = dto?.tipo_comprobante ?? TipoComprobante.BOLETA;

  if (tipo !== TipoComprobante.FACTURA) {
    return { tipo_comprobante: tipo, ruc: null, razon_social: null };
  }

  return {
    tipo_comprobante: tipo,
    ruc: dto?.ruc ?? null,
    razon_social: dto?.razon_social ?? null,
  };
}
