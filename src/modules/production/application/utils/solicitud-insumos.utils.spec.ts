import { calcularDisponibilidadInsumos } from './solicitud-insumos.utils';

describe('calcularDisponibilidadInsumos', () => {
  it.each([
    { stocks: [12, 6], esperado: 'completo' },
    { stocks: [10, 5.5], esperado: 'completo' },
    { stocks: [10, 0], esperado: 'parcial' },
    { stocks: [9, 5.5], esperado: 'parcial' },
    { stocks: [0, 0], esperado: 'sin_stock' },
    { stocks: [9.99, 5.49], esperado: 'sin_stock' },
  ])('stocks $stocks producen $esperado', ({ stocks, esperado }) => {
    expect(
      calcularDisponibilidadInsumos([
        { stock_disponible: stocks[0], cantidad_solicitada: 10 },
        { stock_disponible: stocks[1], cantidad_solicitada: 5.5 },
      ]),
    ).toBe(esperado);
  });
});
