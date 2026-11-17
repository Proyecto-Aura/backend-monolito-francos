import { TipoInsumo, UnidadMedidaInsumo } from '../enums';

export class InsumoEntity {
  constructor(
    public readonly id: number,
    public sku: string,
    public nombre: string,
    public descripcion: string | null,
    public unidad_medida: UnidadMedidaInsumo,
    public stock_actual: number,
    public stock_minimo: number,
    public stock_maximo: number,
    public tipo: TipoInsumo,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
