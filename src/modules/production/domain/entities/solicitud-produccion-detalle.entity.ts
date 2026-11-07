import { UnidadMedidaPresentacion } from '../../../catalog/domain/enums';

export class SolicitudProduccionDetalleEntity {
  constructor(
    public readonly id: number,
    public readonly solicitud_produccion_id: number,
    public readonly producto_terminado_id: number,
    // Embebidos (sku, producto_*, categoria_*, presentacion_*) para que el
    // front no tenga que resolver el catálogo aparte, igual que en lotes y
    // movimientos de producto terminado.
    public readonly sku: string,
    public readonly producto_id: number,
    public readonly producto_nombre: string,
    public readonly categoria_id: number,
    public readonly categoria_nombre: string,
    public readonly presentacion_id: number,
    public readonly presentacion_cantidad: number,
    public readonly presentacion_unidad_medida: UnidadMedidaPresentacion,
    public cantidad_solicitada: number,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
