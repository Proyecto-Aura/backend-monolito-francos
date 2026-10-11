export class DocumentoEstrategicoEntity {
  constructor(
    public readonly id: number,
    public plan_estrategico_id: number,
    public tipo_modulo_id: number,
    public nombre: string,
    public ruta_archivo: string,
    public nombre_original: string | null,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
