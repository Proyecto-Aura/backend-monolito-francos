export class EstadoObjetivoEntity {
  constructor(
    public readonly id: number,
    public readonly codigo: string,
    public readonly nombre: string,
    public readonly orden: number,
    public readonly estado: boolean,
  ) {}
}
