import { EstadoLoteInsumo } from '../enums';

export class LoteInsumoEntity {
  constructor(
    public readonly id: number,
    public readonly insumo_id: number,
    public codigo_lote: string,
    public fecha_ingreso: Date,
    public fecha_vencimiento: Date | null,
    public readonly cantidad_inicial: number,
    public cantidad_actual: number,
    public estado: EstadoLoteInsumo,
    public activo: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
