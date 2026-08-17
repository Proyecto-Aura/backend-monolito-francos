export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly persona_id: string,
    public email: string,
    public username: string,
    public contrasena: string,
    public estado: boolean,
    public email_verificado: boolean,
    public debe_cambiar_contrasena: boolean,
    public token_verificacion_email: string | null,
    public token_verificacion_email_expiracion: Date | null,
    public token_recuperacion: string | null,
    public token_expiracion: Date | null,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
