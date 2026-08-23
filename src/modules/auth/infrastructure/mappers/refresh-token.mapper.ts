import { RefreshToken as PrismaRefreshToken } from '@prisma/client';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';

export class RefreshTokenMapper {
  static toDomain(refreshToken: PrismaRefreshToken): RefreshTokenEntity {
    return new RefreshTokenEntity(
      refreshToken.id,
      refreshToken.user_id,
      refreshToken.token_hash,
      refreshToken.expires_at,
      refreshToken.revoked_at,
      refreshToken.created_at,
    );
  }
}
