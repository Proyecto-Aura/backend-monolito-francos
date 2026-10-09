import { ResourceConflictError } from '../../domain/errors/catalog-domain.errors';
import {
  estaVigente,
  fechaHoy,
  formatFechaDia,
  nombrePromocionPorDefecto,
  parseFechaDia,
  validarRangoFechas,
} from './promocion.utils';

describe('promocion.utils', () => {
  describe('fechaHoy', () => {
    it('usa la fecha de Lima y no la de UTC (22:00 en Lima ya es el día siguiente en UTC)', () => {
      expect(fechaHoy(new Date('2026-10-09T03:00:00.000Z'))).toBe('2026-10-08');
    });

    it('cambia de día a medianoche de Lima', () => {
      expect(fechaHoy(new Date('2026-10-09T05:00:00.000Z'))).toBe('2026-10-09');
    });
  });

  describe('parseFechaDia / formatFechaDia', () => {
    it('convierte YYYY-MM-DD a medianoche UTC y de vuelta sin desfase', () => {
      const fecha = parseFechaDia('2026-10-31');

      expect(fecha.toISOString()).toBe('2026-10-31T00:00:00.000Z');
      expect(formatFechaDia(fecha)).toBe('2026-10-31');
    });
  });

  describe('nombrePromocionPorDefecto', () => {
    it('arma el nombre con el porcentaje', () => {
      expect(nombrePromocionPorDefecto(50)).toBe('Descuento 50%');
      expect(nombrePromocionPorDefecto(12.5)).toBe('Descuento 12.5%');
    });
  });

  describe('validarRangoFechas', () => {
    it('acepta fin posterior o igual al inicio', () => {
      expect(() =>
        validarRangoFechas(
          parseFechaDia('2026-10-01'),
          parseFechaDia('2026-10-31'),
        ),
      ).not.toThrow();
      expect(() =>
        validarRangoFechas(
          parseFechaDia('2026-10-01'),
          parseFechaDia('2026-10-01'),
        ),
      ).not.toThrow();
    });

    it('rechaza fin anterior al inicio con un error de conflicto', () => {
      expect(() =>
        validarRangoFechas(
          parseFechaDia('2026-10-02'),
          parseFechaDia('2026-10-01'),
        ),
      ).toThrow(ResourceConflictError);
    });
  });

  describe('estaVigente', () => {
    const promo = (inicio: string, fin: string, estado = true) => ({
      fecha_inicio: parseFechaDia(inicio),
      fecha_fin: parseFechaDia(fin),
      estado,
    });

    it('es vigente dentro del rango, incluyendo el primer y el último día', () => {
      expect(estaVigente(promo('2026-10-01', '2026-10-31'), '2026-10-15')).toBe(
        true,
      );
      expect(estaVigente(promo('2026-10-01', '2026-10-31'), '2026-10-01')).toBe(
        true,
      );
      expect(estaVigente(promo('2026-10-01', '2026-10-31'), '2026-10-31')).toBe(
        true,
      );
    });

    it('no es vigente antes de empezar ni después de terminar', () => {
      expect(estaVigente(promo('2026-10-10', '2026-10-31'), '2026-10-09')).toBe(
        false,
      );
      expect(estaVigente(promo('2026-10-01', '2026-10-31'), '2026-11-01')).toBe(
        false,
      );
    });

    it('una promoción desactivada nunca es vigente', () => {
      expect(
        estaVigente(promo('2026-10-01', '2026-10-31', false), '2026-10-15'),
      ).toBe(false);
    });
  });
});
