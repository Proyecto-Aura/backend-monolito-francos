import { TipoMovimientoInsumo, UnidadMedidaInsumo } from '../enums';

// Registro histórico e inmutable: no hay updated_at ni campo de estado
// propio, nunca se edita ni se borra una vez creado.
export class MovimientoInsumoEntity {
  constructor(
    public readonly id: number,
    public readonly codigo: string,
    public readonly lote_insumo_id: number,
    // Embebidos (codigo_lote, insumo_*) para que el front no tenga que
    // resolver el lote ni el insumo aparte en listados (ej. historial de
    // movimientos).
    public readonly codigo_lote: string,
    public readonly insumo_id: number,
    public readonly insumo_nombre: string,
    public readonly insumo_sku: string,
    public readonly insumo_unidad_medida: UnidadMedidaInsumo,
    public readonly tipo: TipoMovimientoInsumo,
    public readonly cantidad: number,
    public readonly stock_anterior: number,
    public readonly stock_resultante: number,
    public readonly razon: string,
    public readonly fecha: Date,
    public readonly created_at: Date,
  ) {}
}
