export class PeriodoEntity {
  constructor(
    public readonly id: number,
    public frecuencia_id: number,
    public numero: number,
    public codigo: string,
    public nombre: string,
    public mes_fin: number,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
