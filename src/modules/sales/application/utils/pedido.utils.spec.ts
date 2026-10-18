import { InvalidRequestError } from '../../domain/errors/sales-domain.errors';
import { PresentacionParaPedido } from '../../domain/repositories/types/pedido-repository.types';
import {
  calcularLinea,
  calcularTotal,
  formatCodigoPedido,
  precioAplicado,
  rangoFechasLima,
} from './pedido.utils';

const presentacion = (
  overrides: Partial<PresentacionParaPedido> = {},
): PresentacionParaPedido => ({
  id: 1,
  estado: true,
  producto_estado: true,
  precio_unitario: 5.5,
  precio_mayorista: 4.2,
  umbral_mayorista: 24,
  visible_portal_b: true,
  ...overrides,
});

describe('pedido.utils', () => {
  describe('formatCodigoPedido (RF-A034)', () => {
    it('rellena con ceros hasta 6 dígitos', () => {
      expect(formatCodigoPedido(1)).toBe('PED-000001');
      expect(formatCodigoPedido(4182)).toBe('PED-004182');
    });

    it('no corta ids de más de 6 dígitos', () => {
      expect(formatCodigoPedido(1234567)).toBe('PED-1234567');
    });
  });

  describe('precioAplicado (RN17)', () => {
    it('cobra el unitario si la cantidad no supera el umbral', () => {
      expect(precioAplicado(presentacion(), 24)).toBe(5.5);
    });

    it('cobra el mayorista cuando la cantidad supera el umbral', () => {
      expect(precioAplicado(presentacion(), 25)).toBe(4.2);
    });

    it('cobra el unitario si la presentación no tiene precio mayorista', () => {
      expect(
        precioAplicado(presentacion({ precio_mayorista: null }), 500),
      ).toBe(5.5);
    });

    it('cobra el unitario si la presentación no tiene umbral mayorista', () => {
      expect(
        precioAplicado(presentacion({ umbral_mayorista: null }), 500),
      ).toBe(5.5);
    });
  });

  describe('calcularLinea y calcularTotal (RF-A033)', () => {
    it('guarda el precio base, el aplicado y el subtotal de la línea', () => {
      expect(calcularLinea(presentacion(), 30)).toEqual({
        precio_unitario: 5.5,
        precio_aplicado: 4.2,
        subtotal: 126,
      });
    });

    it('no arrastra errores de coma flotante', () => {
      const linea = calcularLinea(presentacion({ precio_unitario: 0.1 }), 3);

      expect(linea.subtotal).toBe(0.3);
      expect(calcularTotal([0.1, 0.2])).toBe(0.3);
    });

    it('suma los subtotales de todos los ítems', () => {
      expect(calcularTotal([126, 39.6, 8.9])).toBe(174.5);
    });
  });

  describe('rangoFechasLima (RF-A037)', () => {
    it('toma el día completo de Lima, con hasta exclusivo', () => {
      expect(rangoFechasLima('2026-10-01', '2026-10-31')).toEqual({
        desde: new Date('2026-10-01T05:00:00.000Z'),
        hasta: new Date('2026-11-01T05:00:00.000Z'),
      });
    });

    it('permite filtrar un solo día', () => {
      expect(rangoFechasLima('2026-10-15', '2026-10-15')).toEqual({
        desde: new Date('2026-10-15T05:00:00.000Z'),
        hasta: new Date('2026-10-16T05:00:00.000Z'),
      });
    });

    it('acepta solo uno de los dos extremos', () => {
      expect(rangoFechasLima(undefined, '2026-10-15')).toEqual({
        desde: undefined,
        hasta: new Date('2026-10-16T05:00:00.000Z'),
      });
      expect(rangoFechasLima()).toEqual({ desde: undefined, hasta: undefined });
    });

    it('rechaza un rango con desde posterior a hasta', () => {
      expect(() => rangoFechasLima('2026-10-16', '2026-10-15')).toThrow(
        InvalidRequestError,
      );
    });
  });
});
