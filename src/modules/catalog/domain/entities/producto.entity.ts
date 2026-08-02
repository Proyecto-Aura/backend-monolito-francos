export class ProductoEntity {
  constructor(
    public readonly id: number,
    public categoria_id: number,
    public nombre: string,
    public descripcion: string | null,
    public estado: boolean,
    public destacado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
