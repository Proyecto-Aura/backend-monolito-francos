export class ObjetivoEstrategicoEntity {
  constructor(
    public readonly id: number,
    public codigo: string,
    public plan_estrategico_id: number,
    public perspectiva_bsc_id: number,
    public tipo_modulo_id: number,
    public oe_negocio_id: number | null,
    public estado_objetivo_id: number,
    public responsable: string,
    public nombre: string,
    public descripcion: string,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
