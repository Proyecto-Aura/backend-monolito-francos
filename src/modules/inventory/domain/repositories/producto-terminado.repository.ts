import { ProductoTerminadoEntity } from '../entities';
import {
  IndicadoresProductoTerminado,
  UpdateProductoTerminadoParams,
} from './types/producto-terminado-repository.types';

// Crear y listar productos terminados no viven acá: el catálogo
// (Producto/ProductoPresentacion, módulo catalog) ya crea la fila de stock
// automáticamente al dar de alta una presentación, y GET /producto-presentaciones
// ya devuelve ese stock embebido. Lo único que falta en todo el sistema es
// poder editar stock_minimo/stock_maximo, así que este repo solo cubre eso.
export abstract class ProductoTerminadoRepository {
  // Usado por el kardex (OFT0-259) para resolver un producto terminado a
  // partir de su propio id (el que referencian los lotes/movimientos), sin
  // pasar por producto_presentacion_id.
  abstract findById(id: number): Promise<ProductoTerminadoEntity | null>;
  abstract findByProductoPresentacionId(
    productoPresentacionId: number,
  ): Promise<ProductoTerminadoEntity | null>;
  // Upsert: si una producto_presentacion vieja no tiene fila de stock
  // (caso raro, de antes de que existiera la tabla), la crea en vez de
  // fallar con 404.
  abstract updateByProductoPresentacionId(
    productoPresentacionId: number,
    params: UpdateProductoTerminadoParams,
  ): Promise<ProductoTerminadoEntity>;
  abstract existeProductoPresentacion(
    productoPresentacionId: number,
  ): Promise<boolean>;
  abstract getIndicadores(): Promise<IndicadoresProductoTerminado>;
}
