import { ProductoPresentacion as PrismaProductoPresentacion } from '@prisma/client';
import { ProductoPresentacionEntity } from '../../domain/entities';

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
      producto_presentacion.imagen_url,
      producto_presentacion.slug,
      producto_presentacion.estado,
      producto_presentacion.created_at,
      producto_presentacion.updated_at,
    );
  }
}
