export class RelacionOeEntity {
  constructor(
    public readonly id: number,
    public readonly origen_id: number,
    public readonly destino_id: number,
    public estado: boolean,
  ) {}
}
