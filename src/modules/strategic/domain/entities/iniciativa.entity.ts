export class IniciativaEntity {
  constructor(
    public readonly id: number,
    public codigo: string,
    public objetivo_estrategico_id: number,
    public estado_iniciativa_id: number,
    public responsable: string,
    public nombre: string,
    public descripcion: string | null,
    public fecha_inicio: Date,
    public fecha_fin: Date,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
