import { EstadoPedido } from '../enums';
import {
  esEstadoDeDespacho,
  esTransicionDeDespacho,
  esTransicionDeVentas,
} from './transiciones-pedido';

describe('Transiciones de pedido (RN6)', () => {
  const TODOS = Object.values(EstadoPedido);

  describe('despacho', () => {
    it.each([
      [EstadoPedido.PENDIENTE_ENTREGA, EstadoPedido.EN_CAMINO],
      [EstadoPedido.EN_CAMINO, EstadoPedido.ENTREGADO],
    ])('permite pasar de %s a %s', (desde, hacia) => {
      expect(esTransicionDeDespacho(desde, hacia)).toBe(true);
    });

    it('no permite ninguna otra combinación', () => {
      const validas = new Set([
        `${EstadoPedido.PENDIENTE_ENTREGA}>${EstadoPedido.EN_CAMINO}`,
        `${EstadoPedido.EN_CAMINO}>${EstadoPedido.ENTREGADO}`,
      ]);

      for (const desde of TODOS) {
        for (const hacia of TODOS) {
          if (!validas.has(`${desde}>${hacia}`)) {
            expect(esTransicionDeDespacho(desde, hacia)).toBe(false);
          }
        }
      }
    });

    it('ve solo pendiente_entrega, en_camino y entregado', () => {
      expect(TODOS.filter(esEstadoDeDespacho)).toEqual([
        EstadoPedido.PENDIENTE_ENTREGA,
        EstadoPedido.EN_CAMINO,
        EstadoPedido.ENTREGADO,
      ]);
    });
  });

  describe('ventas', () => {
    it('no puede hacer las transiciones de despacho', () => {
      expect(
        esTransicionDeVentas(
          EstadoPedido.PENDIENTE_ENTREGA,
          EstadoPedido.EN_CAMINO,
        ),
      ).toBe(false);
      expect(
        esTransicionDeVentas(EstadoPedido.EN_CAMINO, EstadoPedido.ENTREGADO),
      ).toBe(false);
    });
  });
});
