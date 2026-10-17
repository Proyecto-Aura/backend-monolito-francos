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

export function calcularColorSemaforo(
  valor: number,
  semaforosDelAnio: {
    color: string;
    operador: string;
    valor_referencia: number;
  }[],
): string {
  const cumple = (operador: string, referencia: number) => {
    switch (operador) {
      case '>=':
        return valor >= referencia;
      case '>':
        return valor > referencia;
      case '<=':
        return valor <= referencia;
      case '<':
        return valor < referencia;
      case '=':
        return valor === referencia;
      default:
        return false;
    }
  };

  const verde = semaforosDelAnio.find((semaforo) => semaforo.color === 'VERDE');
  const amarillo = semaforosDelAnio.find(
    (semaforo) => semaforo.color === 'AMARILLO',
  );

  if (verde && cumple(verde.operador, verde.valor_referencia)) {
    return 'VERDE';
  }

  if (amarillo && cumple(amarillo.operador, amarillo.valor_referencia)) {
    return 'AMARILLO';
  }

  return 'ROJO';
}
