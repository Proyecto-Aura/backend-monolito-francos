// Número de comprobante como lo muestra SUNAT: serie y correlativo de 8 dígitos
// (B001-00000001).
export function codigoComprobante(serie: string, numero: number): string {
  return `${serie}-${String(numero).padStart(8, '0')}`;
}
