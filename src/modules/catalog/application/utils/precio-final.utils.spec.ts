import { TipoPromocion } from '../../domain/enums';
import {
  calcularPrecioFinal,
  describirPromocion,
  PromocionAplicable,
} from './precio-final.utils';

const promocion = (
  tipo: TipoPromocion,
  valor: number,
  extra: Partial<PromocionAplicable> = {},
): PromocionAplicable => ({
  tipo,
  nombre: 'Promo de prueba',
  valor,
  cantidad_paga: null,
  cantidad_lleva: null,
  ...extra,
});

describe('precio-final.utils', () => {
  describe('calcularPrecioFinal', () => {
    it('sin promoción devuelve el precio', () => {
      expect(calcularPrecioFinal(12.5, null)).toBe(12.5);
    });

    it('aplica el porcentaje', () => {
      expect(
        calcularPrecioFinal(20, promocion(TipoPromocion.PORCENTAJE, 10)),
      ).toBe(18);
    });

    it('redondea el porcentaje a 2 decimales', () => {
      // 10.05 * 0.5 = 5.025 -> 5.03 (medio céntimo hacia arriba).
      expect(
        calcularPrecioFinal(10.05, promocion(TipoPromocion.PORCENTAJE, 50)),
      ).toBe(5.03);
      // 9.99 * (1 - 0.3333) = 6.660333 -> 6.66.
      expect(
        calcularPrecioFinal(9.99, promocion(TipoPromocion.PORCENTAJE, 33.33)),
      ).toBe(6.66);
    });

    it('no arrastra errores de coma flotante', () => {
      // En coma flotante 0.1 + 0.2 da 0.30000000000000004.
      expect(
        calcularPrecioFinal(0.3, promocion(TipoPromocion.MONTO_FIJO, 0.1)),
      ).toBe(0.2);
      expect(
        calcularPrecioFinal(1.15, promocion(TipoPromocion.PORCENTAJE, 0)),
      ).toBe(1.15);
    });

    it('resta el monto fijo', () => {
      expect(
        calcularPrecioFinal(15.9, promocion(TipoPromocion.MONTO_FIJO, 2.5)),
      ).toBe(13.4);
    });

    it('nunca baja de 0', () => {
      expect(
        calcularPrecioFinal(5, promocion(TipoPromocion.MONTO_FIJO, 7.5)),
      ).toBe(0);
      expect(
        calcularPrecioFinal(5, promocion(TipoPromocion.PORCENTAJE, 150)),
      ).toBe(0);
    });

    it('en nxm y regalo el precio unitario no cambia', () => {
      expect(
        calcularPrecioFinal(
          8,
          promocion(TipoPromocion.NXM, 0, {
            cantidad_lleva: 2,
            cantidad_paga: 1,
          }),
        ),
      ).toBe(8);
      expect(calcularPrecioFinal(8, promocion(TipoPromocion.REGALO, 0))).toBe(
        8,
      );
    });
  });

  describe('describirPromocion', () => {
    it('describe el porcentaje y el monto fijo', () => {
      expect(describirPromocion(promocion(TipoPromocion.PORCENTAJE, 15))).toBe(
        '15% de descuento',
      );
      expect(describirPromocion(promocion(TipoPromocion.MONTO_FIJO, 3))).toBe(
        'S/ 3.00 de descuento',
      );
    });

    it('describe el nxm con lo que se lleva y lo que se paga', () => {
      expect(
        describirPromocion(
          promocion(TipoPromocion.NXM, 0, {
            cantidad_lleva: 2,
            cantidad_paga: 1,
          }),
        ),
      ).toBe('2x1');
    });

    it('usa el nombre si al nxm le faltan cantidades, y en el regalo', () => {
      expect(describirPromocion(promocion(TipoPromocion.NXM, 0))).toBe(
        'Promo de prueba',
      );
      expect(describirPromocion(promocion(TipoPromocion.REGALO, 0))).toBe(
        'Promo de prueba',
      );
    });
  });
});
