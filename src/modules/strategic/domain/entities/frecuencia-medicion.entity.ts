export class FrecuenciaMedicionEntity {
  constructor(
    public readonly id: number,
    public nombre: string,
    public periodos_por_anio: number,
    public orden: number,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
