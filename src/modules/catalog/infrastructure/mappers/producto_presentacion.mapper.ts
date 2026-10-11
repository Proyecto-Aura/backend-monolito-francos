import {
  Prisma,
  ProductoPresentacion as PrismaProductoPresentacion,
} from '@prisma/client';
import { ProductoPresentacionEntity } from '../../domain/entities';
import { UnidadMedidaPresentacion } from '../../domain/enums';
import { ProductoPresentacionCatalogo } from '../../domain/repositories/types/producto_presentacion-repository.types';
import { PromocionMapper } from './promocion.mapper';

// Lo que se pide a Prisma para armar una fila del catálogo.
export const PRODUCTO_PRESENTACION_CATALOGO_INCLUDE = (fechaReferencia: Date) =>
  ({
    producto: { include: { categoria: true } },
    presentacion: true,
    producto_terminado: true,
    // La promoción vigente: activa y con el día de referencia dentro del rango.
    promociones: {
      where: {
        estado: true,
        fecha_inicio: { lte: fechaReferencia },
        fecha_fin: { gte: fechaReferencia },
      },
      orderBy: { fecha_inicio: 'desc' },
      take: 1,
    },
  }) satisfies Prisma.ProductoPresentacionInclude;

type PrismaProductoPresentacionCatalogo =
  Prisma.ProductoPresentacionGetPayload<{
    include: ReturnType<typeof PRODUCTO_PRESENTACION_CATALOGO_INCLUDE>;
  }>;

export class ProductoPresentacionMapper {
  static toDomain(
    producto_presentacion: PrismaProductoPresentacion,
  ): ProductoPresentacionEntity {
    return new ProductoPresentacionEntity(
      producto_presentacion.id,
      producto_presentacion.sku,
      producto_presentacion.precio_unitario.toNumber(),
      producto_presentacion.precio_mayorista
        ? producto_presentacion.precio_mayorista.toNumber()
        : null,
      producto_presentacion.umbral_mayorista,
      producto_presentacion.producto_id,
      producto_presentacion.presentacion_id,
      producto_presentacion.imagen_key,
      producto_presentacion.slug,
      producto_presentacion.estado,
      producto_presentacion.created_at,
      producto_presentacion.updated_at,
    );
  }

  static toCatalogo(
    fila: PrismaProductoPresentacionCatalogo,
  ): ProductoPresentacionCatalogo {
    const promocion = fila.promociones[0];

    return Object.assign(ProductoPresentacionMapper.toDomain(fila), {
      visible_portal_b: fila.visible_portal_b,
      producto: {
        id: fila.producto.id,
        nombre: fila.producto.nombre,
        descripcion: fila.producto.descripcion,
        destacado: fila.producto.destacado,
        estado: fila.producto.estado,
        categoria: {
          id: fila.producto.categoria.id,
          nombre: fila.producto.categoria.nombre,
        },
      },
      presentacion: {
        id: fila.presentacion.id,
        cantidad: fila.presentacion.cantidad,
        unidad_medida: fila.presentacion
          .unidad_medida as UnidadMedidaPresentacion,
        descripcion: fila.presentacion.descripcion,
      },
      producto_terminado: fila.producto_terminado
        ? {
            stock_actual: fila.producto_terminado.stock_actual.toNumber(),
            stock_minimo: fila.producto_terminado.stock_minimo.toNumber(),
            stock_maximo: fila.producto_terminado.stock_maximo
              ? fila.producto_terminado.stock_maximo.toNumber()
              : null,
          }
        : null,
      promocion_vigente: promocion ? PromocionMapper.toDomain(promocion) : null,
    });
  }
}
