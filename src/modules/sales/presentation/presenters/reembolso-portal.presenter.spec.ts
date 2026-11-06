import { makeSolicitud } from '../../application/use-cases/reembolso/reembolso.fixtures';
import { ReembolsoPortalPresenter } from './reembolso-portal.presenter';

describe('ReembolsoPortalPresenter (HU-B-014)', () => {
  it('el listado trae el motivo y la descripción por separado', () => {
    const http = ReembolsoPortalPresenter.resumenToHttp(makeSolicitud());

    expect(http).toMatchObject({
      codigo: 'SOL-000003',
      motivo: 'Entrega incompleta',
      descripcion: 'faltaron 4 packs de canchita serrana.',
    });
  });

  it('el detalle conserva el texto unido además de los dos campos', () => {
    const http = ReembolsoPortalPresenter.detalleToHttp({
      ...makeSolicitud(),
      evidencia_url: 'https://docs/firmada',
    });

    expect(http.motivo).toBe('Entrega incompleta');
    expect(http.descripcion).toBe('faltaron 4 packs de canchita serrana.');
    expect(http.motivo_cliente).toBe(
      'Entrega incompleta: faltaron 4 packs de canchita serrana.',
    );
  });

  it('una solicitud anterior sin descripción devuelve null, sin inventarla', () => {
    const http = ReembolsoPortalPresenter.resumenToHttp(
      makeSolicitud({ motivo: 'Cobro duplicado', descripcion: null }),
    );

    expect(http.motivo).toBe('Cobro duplicado');
    expect(http.descripcion).toBeNull();
  });
});
