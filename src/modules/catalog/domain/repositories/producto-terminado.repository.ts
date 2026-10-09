export abstract class ProductoTerminadoRepository {
  // ¿Alguna presentación de este producto tiene stock disponible?
  abstract existsConStockByProducto(productoId: number): Promise<boolean>;

  // ¿Esta presentación del producto tiene stock disponible?
  abstract existsConStockByProductoPresentacion(
    productoPresentacionId: number,
  ): Promise<boolean>;
}
