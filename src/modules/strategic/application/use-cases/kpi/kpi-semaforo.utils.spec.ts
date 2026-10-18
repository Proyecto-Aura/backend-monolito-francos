import {
  complementoOperador,
  esConfiguracionSemaforoCoherente,
} from './kpi-semaforo.utils';

describe('KPI semáforo utils', () => {
  describe('esConfiguracionSemaforoCoherente', () => {
    it.each([
      ['>=', '>=', 20, 15],
      ['>=', '>', 20, 20],
      ['<=', '<=', 20, 25],
      ['<=', '<', 20, 20],
    ] as const)(
      'acepta verde %s y amarillo %s con umbrales coherentes',
      (operadorVerde, operadorAmarillo, meta, valorAmarillo) => {
        expect(
          esConfiguracionSemaforoCoherente({
            anio: 2027,
            meta,
            operador_verde: operadorVerde,
            operador_amarillo: operadorAmarillo,
            valor_amarillo: valorAmarillo,
          }),
        ).toBe(true);
      },
    );

    it.each([
      ['>=', '<=', 20, 15],
      ['>=', '>=', 20, 25],
      ['<=', '>=', 20, 25],
      ['<=', '<=', 20, 15],
      ['>=', '=', 20, 20],
    ] as const)(
      'rechaza verde %s y amarillo %s incoherentes',
      (operadorVerde, operadorAmarillo, meta, valorAmarillo) => {
        expect(
          esConfiguracionSemaforoCoherente({
            anio: 2027,
            meta,
            operador_verde: operadorVerde,
            operador_amarillo: operadorAmarillo,
            valor_amarillo: valorAmarillo,
          }),
        ).toBe(false);
      },
    );
  });

  it.each([
    ['>=', '<'],
    ['>', '<='],
    ['<=', '>'],
    ['<', '>='],
    ['=', '='],
  ] as const)('calcula el complemento de %s', (operador, esperado) => {
    expect(complementoOperador(operador)).toBe(esperado);
  });
});
