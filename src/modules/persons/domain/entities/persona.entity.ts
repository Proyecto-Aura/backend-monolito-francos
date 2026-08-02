import { TipoDocumento } from '../enums/persons.enums';

export class PersonaEntity {
  constructor(
    public readonly id: string,
    public nombres: string,
    public apellido_paterno: string,
    public apellido_materno: string,
    public tipo_documento: TipoDocumento,
    public numero_documento: string,
    public telefono: string | null,
    public fecha_nacimiento: Date | null,
    public direccion: string | null,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
