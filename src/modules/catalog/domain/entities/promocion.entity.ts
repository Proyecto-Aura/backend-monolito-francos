import { TipoPromocion } from '../enums';

export class PromocionEntity {
  constructor(
    public readonly id: number,
    public producto_presentacion_id: number,
    public nombre: string,
    public tipo: TipoPromocion,
    public valor: number,
    public cantidad_paga: number | null,
    public cantidad_lleva: number | null,
    public cantidad_minima: number | null,
    public producto_presentacion_regalo_id: number | null,
    public fecha_inicio: Date,
    public fecha_fin: Date,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
