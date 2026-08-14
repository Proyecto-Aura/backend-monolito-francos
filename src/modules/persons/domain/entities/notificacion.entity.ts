import { ReferenciaTipo } from '../enums/persons.enums';

export class NotificacionEntity {
  constructor(
    public readonly id: number,
    public tipo: string,
    public titulo: string,
    public mensaje: string,
    public referencia_id: string | null,
    public referencia_tipo: ReferenciaTipo | null,
    public readonly created_at: Date,
  ) {}
}
