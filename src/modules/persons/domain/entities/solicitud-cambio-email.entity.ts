// HU-B-016: correo nuevo que el cliente pidió y aún no confirma.
export class SolicitudCambioEmailEntity {
  constructor(
    public readonly id: string,
    public readonly user_id: string,
    public readonly email_nuevo: string,
    public readonly token_hash: string,
    public readonly expira_at: Date,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
