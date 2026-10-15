import { SemaforoAnualInput } from '../../../domain/repositories/types/kpi-repository.types';

export const KPI_SEMAFORO_COLORES = {
  VERDE: '#22C55E',
  AMARILLO: '#EAB308',
  ROJO: '#EF4444',
} as const;

export function esConfiguracionSemaforoCoherente(
  fila: SemaforoAnualInput,
): boolean {
  if (fila.operador_verde === '>=') {
    return (
      (fila.operador_amarillo === '>=' || fila.operador_amarillo === '>') &&
      fila.valor_amarillo <= fila.meta
    );
  }

  return (
    (fila.operador_amarillo === '<=' || fila.operador_amarillo === '<') &&
    fila.valor_amarillo >= fila.meta
  );
}

export function complementoOperador(
  operador: SemaforoAnualInput['operador_amarillo'],
): SemaforoAnualInput['operador_amarillo'] {
  const complementos: Record<
    SemaforoAnualInput['operador_amarillo'],
    SemaforoAnualInput['operador_amarillo']
  > = {
    '>=': '<',
    '>': '<=',
    '<=': '>',
    '<': '>=',
    '=': '=',
  };

  return complementos[operador];
}
