export class PerspectivaBscEntity {
  constructor(
    public readonly id: number,
    public readonly nombre: string,
    public readonly descripcion: string | null,
    public readonly orden: number,
    public readonly estado: boolean,
  ) {}
}
