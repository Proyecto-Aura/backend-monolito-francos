import { TipoMovimientoInsumo } from '../enums';

// Registro histórico e inmutable: no hay updated_at ni campo de estado
// propio, nunca se edita ni se borra una vez creado.
export class MovimientoInsumoEntity {
  constructor(
    public readonly id: number,
    public readonly lote_insumo_id: number,
    public readonly tipo: TipoMovimientoInsumo,
    public readonly cantidad: number,
    public readonly stock_anterior: number,
    public readonly stock_resultante: number,
    public readonly razon: string,
    public readonly fecha: Date,
    public readonly created_at: Date,
  ) {}
}
