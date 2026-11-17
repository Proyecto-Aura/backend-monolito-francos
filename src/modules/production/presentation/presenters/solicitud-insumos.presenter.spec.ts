import {
  SolicitudInsumosDetalleEntity,
  SolicitudInsumosEntity,
} from '../../domain/entities';
import { EstadoSolicitudInsumos } from '../../domain/enums';
import { UnidadMedidaInsumo } from '../../../inventory/domain/enums';
import { SolicitudInsumosPresenter } from './solicitud-insumos.presenter';
import { DisponibilidadSolicitudInsumos } from '../../domain/repositories/types/solicitud-insumos-repository.types';

describe('SolicitudInsumosPresenter.conDetalleToHttp', () => {
  const fecha = new Date('2026-11-05T05:00:00Z');
  const solicitud = new SolicitudInsumosEntity(
    1,
    'SIN-001',
    null,
    EstadoSolicitudInsumos.PENDIENTE,
    fecha,
    null,
    'usuario-1',
    'Usuario Produccion',
    fecha,
    fecha,
    2,
  );

  it.each<DisponibilidadSolicitudInsumos>(['completo', 'parcial', 'sin_stock'])(
    'serializa el resumen paginado con disponibilidad %s',
    (disponibilidad) => {
      const respuesta = SolicitudInsumosPresenter.paginatedToHttp({
        data: [{ solicitud, disponibilidad }],
        total: 3,
        page: 2,
        limit: 2,
      });

      expect(respuesta).toEqual({
        data: [
          { ...SolicitudInsumosPresenter.toHttp(solicitud), disponibilidad },
        ],
        meta: { total: 3, page: 2, limit: 2, total_pages: 2 },
      });
      expect(respuesta.data[0]).not.toHaveProperty('solicitud');
    },
  );

  it('omite disponibilidad cuando el resumen no la incluye', () => {
    const respuesta = SolicitudInsumosPresenter.paginatedToHttp({
      data: [{ solicitud }],
      total: 1,
      page: 1,
      limit: 10,
    });

    expect(respuesta.data[0]).toEqual(
      SolicitudInsumosPresenter.toHttp(solicitud),
    );
    expect(respuesta.data[0]).not.toHaveProperty('disponibilidad');
    expect(respuesta.data[0]).not.toHaveProperty('solicitud');
  });

  it.each([
    { stocks: [10, 5.5], esperado: 'completo' },
    { stocks: [10, 4], esperado: 'parcial' },
    { stocks: [9, 0], esperado: 'sin_stock' },
  ])(
    'expone stock por linea y disponibilidad $esperado',
    ({ stocks, esperado }) => {
      const detalle = stocks.map(
        (stock, indice) =>
          new SolicitudInsumosDetalleEntity(
            indice + 1,
            solicitud.id,
            indice + 100,
            `SKU-${indice}`,
            `Insumo ${indice}`,
            UnidadMedidaInsumo.KG,
            stock,
            indice === 0 ? 10 : 5.5,
            fecha,
          ),
      );

      const respuesta = SolicitudInsumosPresenter.conDetalleToHttp({
        solicitud,
        detalle,
      });

      expect(respuesta.disponibilidad).toBe(esperado);
      expect(respuesta.detalle).toEqual(
        detalle.map((linea, indice) => ({
          id: linea.id,
          solicitud_insumos_id: solicitud.id,
          insumo_id: linea.insumo_id,
          insumo_sku: linea.insumo_sku,
          insumo_nombre: linea.insumo_nombre,
          insumo_unidad_medida: UnidadMedidaInsumo.KG,
          stock_disponible: stocks[indice],
          cantidad_solicitada: indice === 0 ? 10 : 5.5,
          created_at: fecha,
        })),
      );
    },
  );
});
