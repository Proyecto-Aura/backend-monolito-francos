import { UnidadMedidaPresentacion } from '../../../catalog/domain/enums';
import { SolicitudProduccionDetalleEntity } from '../../domain/entities';
import { SolicitudProduccionDetallePresenter } from './solicitud-produccion-detalle.presenter';

describe('SolicitudProduccionDetallePresenter: lote creado opcional', () => {
  const fecha = new Date('2026-11-04T12:00:00Z');
  const detalle = new SolicitudProduccionDetalleEntity(
    7,
    1,
    10,
    'SKU-10',
    2,
    'Chifles',
    3,
    'Snacks',
    4,
    250,
    UnidadMedidaPresentacion.GR,
    50,
    fecha,
    fecha,
  );

  it('omite lote_creado al presentar una línea sin ese indicador', () => {
    const resultado = SolicitudProduccionDetallePresenter.toHttp(detalle);
    expect(resultado).toMatchObject({
      id: 7,
      producto_terminado_id: 10,
      updated_at: fecha,
    });
    expect(resultado).not.toHaveProperty('lote_creado');
    expect(
      SolicitudProduccionDetallePresenter.listToHttp([detalle])[0],
    ).not.toHaveProperty('lote_creado');
  });

  it.each([true, false])(
    'incluye lote_creado=%s incluso cuando es false',
    (lote_creado) => {
      expect(
        SolicitudProduccionDetallePresenter.toHttp(detalle, lote_creado),
      ).toMatchObject({ id: 7, lote_creado });
    },
  );

  it('presenta la lista enriquecida conservando los indicadores por línea', () => {
    const resultado = SolicitudProduccionDetallePresenter.listConLoteToHttp([
      { detalle, lote_creado: false },
      { detalle, lote_creado: true },
    ]);
    expect(resultado).toEqual([
      {
        ...SolicitudProduccionDetallePresenter.toHttp(detalle),
        lote_creado: false,
      },
      {
        ...SolicitudProduccionDetallePresenter.toHttp(detalle),
        lote_creado: true,
      },
    ]);
  });
});
