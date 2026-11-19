import { CanalNotificacionTipo } from '../enums/persons.enums';

export class CanalNotificacionEntity {
  constructor(
    public readonly id: string,
    public readonly tipo: CanalNotificacionTipo,
    public activo: boolean,
    public destinatarios: string | null,
    public updated_at: Date,
  ) {}
}
