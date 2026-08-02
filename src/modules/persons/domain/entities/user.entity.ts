export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly persona_id: string,
    public email: string,
    public username: string,
    public contrasena: string,
    public estado: boolean,
    public token_recuperacion: string | null,
    public token_expiracion: Date | null,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
