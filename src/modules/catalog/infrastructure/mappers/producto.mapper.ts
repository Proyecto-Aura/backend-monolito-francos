import { Producto as PrismaProducto } from '@prisma/client';
import { ProductoEntity } from '../../domain/entities';

export class ProductoMapper {
  static toDomain(producto: PrismaProducto): ProductoEntity {
    return new ProductoEntity(
      producto.id,
      producto.categoria_id,
      producto.nombre,
      producto.descripcion,
      producto.estado,
      producto.destacado,
      producto.created_at,
      producto.updated_at,
    );
  }
}
