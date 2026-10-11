// El presenter importa config/envs; sin este mock la validación de Joi corre al
// importarse y explota en CI (no hay .env).
jest.mock('../../../../config/envs', () => ({
  envs: { mediaBaseUrl: '/media' },
}));

import {
  ProductoPresentacionEntity,
  PromocionEntity,
} from '../../domain/entities';
import { TipoPromocion, UnidadMedidaPresentacion } from '../../domain/enums';
import { ProductoPresentacionCatalogo } from '../../domain/repositories/types/producto_presentacion-repository.types';
import { ProductoPresentacionPresenter } from './producto_presentacion.presenter';

describe('ProductoPresentacionPresenter (catálogo)', () => {
  const fecha = new Date('2026-10-01T00:00:00.000Z');

  const makeFila = (
    overrides: Partial<ProductoPresentacionCatalogo> = {},
  ): ProductoPresentacionCatalogo =>
    Object.assign(
      new ProductoPresentacionEntity(
        10,
        'FR-P1-PR2',
        18,
        15,
        6,
        1,
        2,
        'productos/chifles.jpg',
        'chifles-clasicos-200-gr-p2',
        true,
        fecha,
        fecha,
      ),
      {
        visible_portal_b: false,
        producto: {
          id: 1,
          nombre: 'Chifles clásicos',
          descripcion: 'Plátano en hojuelas',
          destacado: true,
          estado: true,
          categoria: { id: 4, nombre: 'Chifles' },
        },
        presentacion: {
          id: 2,
          cantidad: 200,
          unidad_medida: UnidadMedidaPresentacion.GR,
          descripcion: null,
        },
        producto_terminado: {
          stock_actual: 0,
          stock_minimo: 1,
          stock_maximo: null,
        },
        promocion_vigente: null,
      },
      overrides,
    );

  it('arma la URL de la imagen con la base de media y la key, y devuelve null si no hay imagen', () => {
    const sinImagen = makeFila({ imagen_key: null });

    expect(ProductoPresentacionPresenter.toHttp(makeFila()).imagen_url).toBe(
      '/media/productos/chifles.jpg',
    );
    expect(
      ProductoPresentacionPresenter.toHttp(sinImagen).imagen_url,
    ).toBeNull();
  });

  it('incluye producto, categoría, presentación, stock y visibilidad junto con la presentación del producto', () => {
    expect(ProductoPresentacionPresenter.catalogoToHttp(makeFila())).toEqual({
      id: 10,
      sku: 'FR-P1-PR2',
      precio_unitario: 18,
      precio_mayorista: 15,
      umbral_mayorista: 6,
      producto_id: 1,
      presentacion_id: 2,
      imagen_url: '/media/productos/chifles.jpg',
      slug: 'chifles-clasicos-200-gr-p2',
      estado: true,
      visible_portal_b: false,
      created_at: fecha,
      updated_at: fecha,
      producto: {
        id: 1,
        nombre: 'Chifles clásicos',
        descripcion: 'Plátano en hojuelas',
        destacado: true,
        estado: true,
        categoria: { id: 4, nombre: 'Chifles' },
      },
      presentacion: {
        id: 2,
        cantidad: 200,
        unidad_medida: 'gr',
        descripcion: null,
      },
      producto_terminado: {
        stock_actual: 0,
        stock_minimo: 1,
        stock_maximo: null,
      },
      promocion_vigente: null,
    });
  });

  it('muestra la promoción vigente con fechas YYYY-MM-DD', () => {
    const promocion = new PromocionEntity(
      7,
      10,
      'Descuento 50%',
      TipoPromocion.PORCENTAJE,
      50,
      null,
      null,
      null,
      null,
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-31T00:00:00.000Z'),
      true,
      fecha,
      fecha,
    );

    const http = ProductoPresentacionPresenter.catalogoToHttp(
      makeFila({ promocion_vigente: promocion }),
    );

    expect(http.promocion_vigente).toEqual({
      id: 7,
      nombre: 'Descuento 50%',
      valor: 50,
      fecha_inicio: '2026-10-01',
      fecha_fin: '2026-10-31',
    });
  });

  it('el listado paginado usa el formato del catálogo y calcula las páginas', () => {
    const http = ProductoPresentacionPresenter.paginatedToHttp({
      data: [makeFila()],
      total: 25,
      page: 2,
      limit: 10,
    });

    expect(http.meta).toEqual({
      total: 25,
      page: 2,
      limit: 10,
      total_pages: 3,
    });
    expect(http.data[0]).toHaveProperty('producto.categoria.nombre', 'Chifles');
  });
});
