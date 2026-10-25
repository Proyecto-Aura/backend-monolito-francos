import { CategoriaCliente, TipoCliente } from '../enums/persons.enums';

export class ClienteEntity {
  constructor(
    public readonly id: string,
    public readonly persona_id: string,
    public tipo_cliente: TipoCliente,
    public razon_social: string | null,
    public categoria_cliente: CategoriaCliente,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
    // Número correlativo de cara al usuario (CLI-000001); lo asigna la base de datos.
    public readonly codigo: number,
  ) {}
}
