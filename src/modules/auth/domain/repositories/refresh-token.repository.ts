import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { CreateRefreshTokenParams } from './types/refresh-token-repository.types';

export abstract class RefreshTokenRepository {
  abstract create(
    params: CreateRefreshTokenParams,
  ): Promise<RefreshTokenEntity>;
  abstract findByTokenHash(
    tokenHash: string,
  ): Promise<RefreshTokenEntity | null>;
  abstract findById(id: string): Promise<RefreshTokenEntity | null>;
  abstract revoke(id: string): Promise<RefreshTokenEntity>;
}
