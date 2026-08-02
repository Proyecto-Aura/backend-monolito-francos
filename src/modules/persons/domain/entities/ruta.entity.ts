export class RutaEntity {
  constructor(
    public readonly id: number,
    public nombre: string,
    public estado: boolean,
    public parent_id: number | null,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
