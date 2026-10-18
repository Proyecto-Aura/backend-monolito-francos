import { esFechaFutura } from './registro-cliente.util';

describe('esFechaFutura', () => {
  // 18/10/2026 a las 23:30 en Lima = 19/10/2026 04:30 UTC.
  const ahora = new Date('2026-10-19T04:30:00.000Z');

  it('compara con el día de hoy en Lima, no en UTC', () => {
    expect(esFechaFutura('2026-10-18', ahora)).toBe(false);
    expect(esFechaFutura('2026-10-19', ahora)).toBe(true);
  });

  it('acepta fechas pasadas y en formato ISO completo', () => {
    expect(esFechaFutura('1998-05-12', ahora)).toBe(false);
    expect(esFechaFutura('2026-10-20T00:00:00.000Z', ahora)).toBe(true);
  });
});
