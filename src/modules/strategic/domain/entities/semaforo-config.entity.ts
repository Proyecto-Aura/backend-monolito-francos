export class SemaforoConfigEntity {
  constructor(
    public readonly id: number,
    public kpi_id: number,
    public anio: number,
    public color: string,
    public color_hex: string,
    public operador: string,
    public valor_referencia: number,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
