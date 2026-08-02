export class AccesoEntity {
  constructor(
    public readonly id: number,
    public readonly rol_id: number,
    public readonly ruta_id: number,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
