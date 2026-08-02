export class UsuarioRolEntity {
  constructor(
    public readonly id: number,
    public readonly user_id: string,
    public readonly rol_id: number,
    public estado: boolean,
    public readonly created_at: Date,
  ) {}
}
