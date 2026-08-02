export class NotificacionUserEntity {
  constructor(
    public readonly notificacion_id: number,
    public readonly user_id: string,
    public leido: boolean,
    public fecha_leido: Date | null,
    public sns_message_id: string | null,
    public readonly created_at: Date,
  ) {}
}
