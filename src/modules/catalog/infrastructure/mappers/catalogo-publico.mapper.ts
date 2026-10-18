import { Prisma } from '@prisma/client';
import { UnidadMedidaPresentacion } from '../../domain/enums';
import {
  CatalogoPublicoItem,
  CatalogoPublicoPresentacion,
  CatalogoPublicoProducto,
} from '../../domain/repositories/types/catalogo-publico-repository.types';
import { PromocionMapper } from './promocion.mapper';

// Condiciones fijas para que una presentación se vea en el Portal B. El
// producto y la categoría se filtran aparte, desde donde se consulte.
export const PRESENTACION_VISIBLE_WHERE = {
  estado: true,
  visible_portal_b: true,
} satisfies Prisma.ProductoPresentacionWhereInput;

export const PRODUCTO_VISIBLE_WHERE = {
  estado: true,
  categoria: { estado: true },
} satisfies Prisma.ProductoWhereInput;

// La promoción vigente: activa y con el día de referencia dentro del rango.
const promocionVigenteInclude = (fechaReferencia: Date) =>
  ({
    where: {
      estado: true,
      fecha_inicio: { lte: fechaReferencia },
      fecha_fin: { gte: fechaReferencia },
    },
    orderBy: { fecha_inicio: 'desc' },
    take: 1,
  }) satisfies Prisma.ProductoPresentacion$promocionesArgs;

export const CATALOGO_PUBLICO_PRESENTACION_INCLUDE = (fechaReferencia: Date) =>
  ({
    presentacion: true,
    producto_terminado: { select: { stock_actual: true } },
    promociones: promocionVigenteInclude(fechaReferencia),
  }) satisfies Prisma.ProductoPresentacionInclude;

export const CATALOGO_PUBLICO_ITEM_INCLUDE = (fechaReferencia: Date) =>
  ({
    ...CATALOGO_PUBLICO_PRESENTACION_INCLUDE(fechaReferencia),
    producto: { include: { categoria: true } },
  }) satisfies Prisma.ProductoPresentacionInclude;

export const CATALOGO_PUBLICO_PRODUCTO_INCLUDE = (fechaReferencia: Date) =>
  ({
    categoria: true,
    producto_presentaciones: {
      where: PRESENTACION_VISIBLE_WHERE,
      include: CATALOGO_PUBLICO_PRESENTACION_INCLUDE(fechaReferencia),
      orderBy: [{ precio_unitario: 'asc' }, { id: 'asc' }],
    },
  }) satisfies Prisma.ProductoInclude;

type PrismaCatalogoPublicoPresentacion = Prisma.ProductoPresentacionGetPayload<{
  include: ReturnType<typeof CATALOGO_PUBLICO_PRESENTACION_INCLUDE>;
}>;

type PrismaCatalogoPublicoItem = Prisma.ProductoPresentacionGetPayload<{
  include: ReturnType<typeof CATALOGO_PUBLICO_ITEM_INCLUDE>;
}>;

type PrismaCatalogoPublicoProducto = Prisma.ProductoGetPayload<{
  include: ReturnType<typeof CATALOGO_PUBLICO_PRODUCTO_INCLUDE>;
}>;

export class CatalogoPublicoMapper {
  static toPresentacion(
    fila: PrismaCatalogoPublicoPresentacion,
  ): CatalogoPublicoPresentacion {
    const promocion = fila.promociones[0];

    return {
      id: fila.id,
      slug: fila.slug,
      precio_unitario: fila.precio_unitario.toNumber(),
      imagen_key: fila.imagen_key,
      presentacion: {
        id: fila.presentacion.id,
        cantidad: fila.presentacion.cantidad,
        unidad_medida: fila.presentacion
          .unidad_medida as UnidadMedidaPresentacion,
        descripcion: fila.presentacion.descripcion,
      },
      disponible: fila.producto_terminado
        ? fila.producto_terminado.stock_actual.gt(0)
        : false,
      promocion_vigente: promocion ? PromocionMapper.toDomain(promocion) : null,
    };
  }

  static toItem(fila: PrismaCatalogoPublicoItem): CatalogoPublicoItem {
    return {
      ...CatalogoPublicoMapper.toPresentacion(fila),
      producto: {
        id: fila.producto.id,
        nombre: fila.producto.nombre,
        descripcion: fila.producto.descripcion,
        destacado: fila.producto.destacado,
        categoria: {
          id: fila.producto.categoria.id,
          nombre: fila.producto.categoria.nombre,
        },
      },
    };
  }

  static toProducto(
    producto: PrismaCatalogoPublicoProducto,
  ): CatalogoPublicoProducto {
    return {
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      destacado: producto.destacado,
      categoria: {
        id: producto.categoria.id,
        nombre: producto.categoria.nombre,
      },
      presentaciones: producto.producto_presentaciones.map((pp) =>
        CatalogoPublicoMapper.toPresentacion(pp),
      ),
    };
  }
}
