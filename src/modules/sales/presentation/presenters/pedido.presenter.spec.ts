import { DetallePedidoEntity, PedidoEntity } from '../../domain/entities';
import { EstadoPedido, OrigenPedido, TipoEntrega } from '../../domain/enums';
import {
  PedidoDetalle,
  PedidoResumen,
} from '../../domain/repositories/types/pedido-repository.types';
import { PedidoPresenter } from './pedido.presenter';

describe('PedidoPresenter: disponibilidad opcional del listado', () => {
  const fecha = new Date('2026-11-03T12:00:00Z');
  const resumen: PedidoResumen = {
    pedido: new PedidoEntity(
      7,
      'PED-007',
      'cliente-id',
      null,
      OrigenPedido.MANUAL,
      EstadoPedido.PENDIENTE_ENTREGA,
      TipoEntrega.DELIVERY,
      'Lima',
      80,
      fecha,
      fecha,
    ),
    cliente_nombre: 'Cliente Prueba',
    metodo_pago: null,
    cantidad_productos: 2,
    cantidad_unidades: 8,
  };

  it.each(['completo', 'parcial', 'sin_stock'] as const)(
    'incluye disponibilidad=%s cuando el repositorio la calculó',
    (disponibilidad) => {
      expect(
        PedidoPresenter.resumenToHttp({ ...resumen, disponibilidad }),
      ).toMatchObject({ id: 7, productos: 2, unidades: 8, disponibilidad });
    },
  );

  it('omite el campo cuando no fue solicitado', () => {
    expect(PedidoPresenter.resumenToHttp(resumen)).not.toHaveProperty(
      'disponibilidad',
    );
  });

  it.each([
    { esperado: 'completo', stocks: [3, 5] },
    { esperado: 'parcial', stocks: [3, 0] },
    { esperado: 'sin_stock', stocks: [2, 4] },
  ])(
    'el detalle de inventario clasifica como $esperado',
    ({ esperado, stocks }) => {
      const detalle: PedidoDetalle = {
        pedido: resumen.pedido,
        cliente_nombre: resumen.cliente_nombre,
        pago: null,
        detalles: stocks.map((stock_disponible, i) => ({
          detalle: new DetallePedidoEntity(
            i + 1,
            7,
            10 + i,
            i === 0 ? 3 : 5,
            10,
            10,
            i === 0 ? 30 : 50,
            fecha,
          ),
          sku: `SKU-${i}`,
          producto_nombre: 'Producto Prueba',
          presentacion: '250 gr',
          stock_disponible,
          producto_terminado_id: 20 + i,
        })),
      };
      const respuesta = PedidoPresenter.detalleInventarioToHttp(detalle);
      expect(respuesta.disponibilidad).toBe(esperado);
      expect(respuesta.items.map((item) => item.stock_disponible)).toEqual(
        stocks,
      );
    },
  );
});
