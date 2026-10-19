export class RefreshTokenEntity {
  constructor(
    public readonly id: string,
    public readonly user_id: string,
    public readonly token_hash: string,
    public readonly expires_at: Date,
    public revoked_at: Date | null,
    public readonly created_at: Date,
  ) {}
}
