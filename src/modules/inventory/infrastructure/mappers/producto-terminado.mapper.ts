import { ProductoTerminado as PrismaProductoTerminado } from '@prisma/client';
import { ProductoTerminadoEntity } from '../../domain/entities';
import { UnidadMedidaPresentacion } from '../../../catalog/domain/enums';

type PrismaProductoTerminadoConCatalogo = PrismaProductoTerminado & {
  producto_presentacion: {
    sku: string;
    estado: boolean;
    producto_id: number;
    presentacion_id: number;
    producto: {
      nombre: string;
      categoria_id: number;
      categoria: { nombre: string };
    };
    presentacion: { cantidad: number; unidad_medida: string };
  };
};

export class ProductoTerminadoMapper {
  static toDomain(
    productoTerminado: PrismaProductoTerminadoConCatalogo,
  ): ProductoTerminadoEntity {
    const { producto_presentacion: pp } = productoTerminado;

    return new ProductoTerminadoEntity(
      productoTerminado.id,
      productoTerminado.producto_presentacion_id,
      pp.sku,
      pp.producto_id,
      pp.producto.nombre,
      pp.producto.categoria_id,
      pp.producto.categoria.nombre,
      pp.presentacion_id,
      pp.presentacion.cantidad,
      pp.presentacion.unidad_medida as UnidadMedidaPresentacion,
      pp.estado,
      productoTerminado.stock_actual.toNumber(),
      productoTerminado.stock_minimo.toNumber(),
      productoTerminado.stock_maximo
        ? productoTerminado.stock_maximo.toNumber()
        : null,
      productoTerminado.created_at,
      productoTerminado.updated_at,
    );
  }
}
