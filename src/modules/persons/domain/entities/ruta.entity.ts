export class RutaEntity {
  constructor(
    public readonly id: number,
    public nombre: string,
    public etiqueta: string,
    public icono: string,
    public descripcion: string | null,
    public estado: boolean,
    public parent_id: number | null,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
