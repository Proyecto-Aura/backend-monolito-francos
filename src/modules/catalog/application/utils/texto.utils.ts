/** Quita espacios en los extremos y colapsa los espacios repetidos. */
export function normalizarTexto(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ');
}
