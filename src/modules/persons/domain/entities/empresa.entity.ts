export class EmpresaEntity {
  constructor(
    public readonly id: number,
    public razon_social: string,
    public ruc: string,
    public direccion: string,
    public telefono: string | null,
    public email: string | null,
    public logo_url: string | null,
    public estado: boolean,
    public es_emisora: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
