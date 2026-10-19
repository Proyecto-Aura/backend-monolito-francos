export class KpiEntity {
  constructor(
    public readonly id: number,
    public codigo: string,
    public objetivo_estrategico_id: number,
    public frecuencia_id: number,
    public unidad_medida_id: number,
    public nombre: string,
    public formula: string,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
