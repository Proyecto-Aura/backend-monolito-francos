// El presenter importa config/envs; sin este mock la validación de Joi corre al
// importarse y explota en CI (no hay .env).
jest.mock('../../../../config/envs', () => ({
  envs: { mediaBaseUrl: '/media' },
}));

import { PromocionEntity } from '../../domain/entities';
import { TipoPromocion, UnidadMedidaPresentacion } from '../../domain/enums';
import { CatalogoPublicoItem } from '../../domain/repositories/types/catalogo-publico-repository.types';
import { CatalogoPublicoPresenter } from './catalogo-publico.presenter';

describe('CatalogoPublicoPresenter', () => {
  const fecha = new Date('2026-10-01T00:00:00.000Z');

  const makeItem = (
    overrides: Partial<CatalogoPublicoItem> = {},
  ): CatalogoPublicoItem => ({
    id: 10,
    slug: 'chifles-clasicos-200-gr-p2',
    precio_unitario: 18,
    imagen_key: 'productos/chifles.jpg',
    presentacion: {
      id: 2,
      cantidad: 200,
      unidad_medida: UnidadMedidaPresentacion.GR,
      descripcion: null,
    },
    disponible: true,
    promocion_vigente: null,
    producto: {
      id: 1,
      nombre: 'Chifles clásicos',
      descripcion: 'Plátano en hojuelas',
      destacado: true,
      categoria: { id: 4, nombre: 'Chifles' },
    },
    ...overrides,
  });

  const makePromocion = (
    tipo: TipoPromocion,
    valor: number,
    cantidad_paga: number | null = null,
    cantidad_lleva: number | null = null,
  ) =>
    new PromocionEntity(
      7,
      10,
      'Promo octubre',
      tipo,
      valor,
      cantidad_paga,
      cantidad_lleva,
      null,
      null,
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-31T00:00:00.000Z'),
      true,
      fecha,
      fecha,
    );

  it('arma una fila plana sin datos internos', () => {
    expect(CatalogoPublicoPresenter.itemToHttp(makeItem())).toEqual({
      id: 10,
      slug: 'chifles-clasicos-200-gr-p2',
      producto_id: 1,
      nombre: 'Chifles clásicos',
      descripcion: 'Plátano en hojuelas',
      destacado: true,
      categoria: { id: 4, nombre: 'Chifles' },
      presentacion: {
        id: 2,
        cantidad: 200,
        unidad_medida: 'gr',
        descripcion: null,
      },
      imagen_url: '/media/productos/chifles.jpg',
      precio: 18,
      precio_final: 18,
      disponible: true,
      promocion: null,
    });
  });

  it('devuelve imagen_url null si no hay imagen', () => {
    expect(
      CatalogoPublicoPresenter.itemToHttp(makeItem({ imagen_key: null }))
        .imagen_url,
    ).toBeNull();
  });

  it('aplica el porcentaje al precio final y describe la promoción', () => {
    const http = CatalogoPublicoPresenter.itemToHttp(
      makeItem({
        promocion_vigente: makePromocion(TipoPromocion.PORCENTAJE, 25),
      }),
    );

    expect(http.precio).toBe(18);
    expect(http.precio_final).toBe(13.5);
    expect(http.promocion).toEqual({
      tipo: 'porcentaje',
      nombre: 'Promo octubre',
      descripcion: '25% de descuento',
      valor: 25,
      cantidad_paga: null,
      cantidad_lleva: null,
      fecha_inicio: '2026-10-01',
      fecha_fin: '2026-10-31',
    });
  });

  it('en nxm describe la promoción y no cambia el precio', () => {
    const http = CatalogoPublicoPresenter.itemToHttp(
      makeItem({
        promocion_vigente: makePromocion(TipoPromocion.NXM, 0, 1, 2),
      }),
    );

    expect(http.precio_final).toBe(18);
    expect(http.promocion).toMatchObject({ tipo: 'nxm', descripcion: '2x1' });
  });

  it('el detalle agrupa las presentaciones bajo el producto', () => {
    const { producto, ...presentacion } = makeItem();

    const http = CatalogoPublicoPresenter.productoToHttp({
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      destacado: producto.destacado,
      categoria: producto.categoria,
      presentaciones: [presentacion],
    });

    expect(http).toMatchObject({
      id: 1,
      nombre: 'Chifles clásicos',
      categoria: { id: 4, nombre: 'Chifles' },
    });
    expect(http.presentaciones).toEqual([
      {
        id: 10,
        slug: 'chifles-clasicos-200-gr-p2',
        presentacion: {
          id: 2,
          cantidad: 200,
          unidad_medida: 'gr',
          descripcion: null,
        },
        imagen_url: '/media/productos/chifles.jpg',
        precio: 18,
        precio_final: 18,
        disponible: true,
        promocion: null,
      },
    ]);
  });

  it('el listado paginado calcula las páginas', () => {
    const http = CatalogoPublicoPresenter.paginatedToHttp({
      data: [makeItem()],
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
    expect(http.data).toHaveLength(1);
  });
});
