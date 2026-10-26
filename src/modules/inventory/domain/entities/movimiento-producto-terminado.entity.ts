import { TipoMovimientoProductoTerminado } from '../enums';
import { UnidadMedidaPresentacion } from '../../../catalog/domain/enums';

// Registro histórico e inmutable: no hay updated_at ni campo de estado
// propio, nunca se edita ni se borra una vez creado.
export class MovimientoProductoTerminadoEntity {
  constructor(
    public readonly id: number,
    public readonly codigo: string,
    public readonly lote_producto_terminado_id: number,
    // Embebidos (codigo_lote, producto_*) para que el front no tenga que
    // resolver el lote ni el catálogo aparte en listados (ej. historial de
    // movimientos).
    public readonly codigo_lote: string,
    public readonly producto_terminado_id: number,
    public readonly sku: string,
    public readonly producto_id: number,
    public readonly producto_nombre: string,
    public readonly categoria_id: number,
    public readonly categoria_nombre: string,
    public readonly presentacion_id: number,
    public readonly presentacion_cantidad: number,
    public readonly presentacion_unidad_medida: UnidadMedidaPresentacion,
    public readonly tipo: TipoMovimientoProductoTerminado,
    public readonly cantidad: number,
    public readonly stock_anterior: number,
    public readonly stock_resultante: number,
    public readonly razon: string,
    public readonly fecha: Date,
    public readonly created_at: Date,
  ) {}
}
