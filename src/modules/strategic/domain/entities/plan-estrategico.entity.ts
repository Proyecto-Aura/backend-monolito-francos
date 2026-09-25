export class PlanEstrategicoEntity {
  constructor(
    public readonly id: number,
    public codigo: string,
    public nombre: string,
    public descripcion: string | null,
    public anio_inicio: number,
    public anio_fin: number,
    public estado_plan_id: number,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
