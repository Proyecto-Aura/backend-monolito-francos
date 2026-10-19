import { TipoComprobante } from '../enums/sales.enums';
import { SerieComprobanteEntity } from './serie-comprobante.entity';

const fecha = new Date('2026-01-01T00:00:00.000Z');
const serie = (
  overrides: Partial<{
    inicio: number;
    fin: number;
    actual: number;
    umbral: number;
    estado: boolean;
  }> = {},
) => {
  const { inicio = 1, fin = 1000, umbral = 100, estado = true } = overrides;
  return new SerieComprobanteEntity(
    1,
    TipoComprobante.BOLETA,
    'B001',
    inicio,
    fin,
    overrides.actual ?? inicio - 1,
    umbral,
    estado,
    fecha,
    fecha,
  );
};

describe('SerieComprobanteEntity', () => {
  it('sin emitir: el siguiente es el inicio y quedan todos los números', () => {
    const nueva = serie({ inicio: 50, fin: 59 });

    expect(nueva.haEmitido).toBe(false);
    expect(nueva.siguiente).toBe(50);
    expect(nueva.restantes).toBe(10);
    expect(nueva.agotada).toBe(false);
  });

  it('tras emitir: siguiente = actual + 1 y restantes = fin - actual', () => {
    const emitida = serie({ inicio: 1, fin: 1000, actual: 400 });

    expect(emitida.haEmitido).toBe(true);
    expect(emitida.siguiente).toBe(401);
    expect(emitida.restantes).toBe(600);
  });

  it('agotada: no tiene siguiente', () => {
    const agotada = serie({ fin: 10, actual: 10 });

    expect(agotada.agotada).toBe(true);
    expect(agotada.restantes).toBe(0);
    expect(agotada.siguiente).toBeNull();
  });

  it('por_agotar cuando restantes <= umbral, incluido el borde', () => {
    expect(serie({ fin: 1000, actual: 899, umbral: 100 }).porAgotar).toBe(
      false,
    );
    expect(serie({ fin: 1000, actual: 900, umbral: 100 }).porAgotar).toBe(true);
    expect(serie({ fin: 1000, actual: 1000, umbral: 100 }).porAgotar).toBe(
      true,
    );
  });

  it('una serie inactiva nunca está por agotar', () => {
    expect(
      serie({ fin: 10, actual: 10, umbral: 100, estado: false }).porAgotar,
    ).toBe(false);
  });
});
