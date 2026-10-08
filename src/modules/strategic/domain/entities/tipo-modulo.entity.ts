export class TipoModuloEntity {
  constructor(
    public readonly id: number,
    public readonly codigo: string,
    public readonly nombre: string,
    public readonly estado: boolean,
  ) {}
}
