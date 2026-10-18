export class UnidadMedidaKpiEntity {
  constructor(
    public readonly id: number,
    public nombre: string,
    public simbolo: string,
    public decimales: number,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
