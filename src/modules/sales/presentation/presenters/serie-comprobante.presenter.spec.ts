import { SerieComprobanteEntity } from '../../domain/entities/serie-comprobante.entity';
import { TipoComprobante } from '../../domain/enums/sales.enums';
import { SerieComprobantePresenter } from './serie-comprobante.presenter';

const fecha = new Date('2026-01-01T00:00:00.000Z');
const serie = (actual: number) =>
  new SerieComprobanteEntity(
    9,
    TipoComprobante.FACTURA,
    'F001',
    101,
    200,
    actual,
    10,
    true,
    fecha,
    fecha,
  );

describe('SerieComprobantePresenter', () => {
  it('sin emitir expone correlativo_actual null y siguiente = inicio', () => {
    expect(SerieComprobantePresenter.toHttp(serie(100))).toEqual({
      id: 9,
      tipo: 'factura',
      serie: 'F001',
      correlativo_inicio: 101,
      correlativo_fin: 200,
      correlativo_actual: null,
      siguiente: 101,
      restantes: 100,
      umbral_alerta: 10,
      por_agotar: false,
      estado: true,
      created_at: fecha,
      updated_at: fecha,
    });
  });

  it('cerca del fin expone restantes y por_agotar', () => {
    expect(SerieComprobantePresenter.toHttp(serie(195))).toEqual(
      expect.objectContaining({
        correlativo_actual: 195,
        siguiente: 196,
        restantes: 5,
        por_agotar: true,
      }),
    );
  });
});
