import { ProductoTerminadoEntity } from '../../domain/entities';

export class ProductoTerminadoPresenter {
  static toHttp(productoTerminado: ProductoTerminadoEntity) {
    return {
      id: productoTerminado.id,
      producto_presentacion_id: productoTerminado.producto_presentacion_id,
      sku: productoTerminado.sku,
      producto_id: productoTerminado.producto_id,
      producto_nombre: productoTerminado.producto_nombre,
      categoria_id: productoTerminado.categoria_id,
      categoria_nombre: productoTerminado.categoria_nombre,
      presentacion_id: productoTerminado.presentacion_id,
      presentacion_cantidad: productoTerminado.presentacion_cantidad,
      presentacion_unidad_medida: productoTerminado.presentacion_unidad_medida,
      stock_actual: productoTerminado.stock_actual,
      stock_minimo: productoTerminado.stock_minimo,
      stock_maximo: productoTerminado.stock_maximo,
      created_at: productoTerminado.created_at,
      updated_at: productoTerminado.updated_at,
    };
  }
}
