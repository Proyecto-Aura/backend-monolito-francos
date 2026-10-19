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
  ) {}
}
