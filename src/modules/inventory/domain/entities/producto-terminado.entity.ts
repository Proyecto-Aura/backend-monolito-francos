import { UnidadMedidaPresentacion } from '../../../catalog/domain/enums';

// Stock de una producto_presentacion YA existente (RF-A024): el catálogo
// (Producto/ProductoPresentacion/Categoria/Presentacion) lo gestiona el
// módulo catalog, acá solo se trackea cuánto hay. Por eso no hay create de
// "producto" en este módulo, solo se asocia stock a una presentación que ya
// fue creada del otro lado.
export class ProductoTerminadoEntity {
  constructor(
    public readonly id: number,
    public readonly producto_presentacion_id: number,
    // Embebidos (sku, producto_*, categoria_*, presentacion_*) para que el
    // front no tenga que resolver el catálogo aparte en el listado de stock.
    public readonly sku: string,
    public readonly producto_id: number,
    public readonly producto_nombre: string,
    public readonly categoria_id: number,
    public readonly categoria_nombre: string,
    public readonly presentacion_id: number,
    public readonly presentacion_cantidad: number,
    public readonly presentacion_unidad_medida: UnidadMedidaPresentacion,
    public stock_actual: number,
    public stock_minimo: number,
    public stock_maximo: number | null,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
