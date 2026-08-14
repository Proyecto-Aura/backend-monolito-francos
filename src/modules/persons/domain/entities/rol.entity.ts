export class RolEntity {
  constructor(
    public readonly id: number,
    public nombre: string,
    public descripcion: string | null,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}