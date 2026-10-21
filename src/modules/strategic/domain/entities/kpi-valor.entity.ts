export class KpiValorEntity {
  constructor(
    public readonly id: number,
    public kpi_id: number,
    public anio: number,
    public periodo_id: number,
    public valor: number,
    public semaforo_color: string,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
