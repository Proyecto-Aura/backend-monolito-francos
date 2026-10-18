export class KpiMetaAnualEntity {
  constructor(
    public readonly id: number,
    public kpi_id: number,
    public anio: number,
    public meta: number,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
