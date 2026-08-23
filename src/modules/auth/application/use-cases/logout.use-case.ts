import { Injectable } from '@nestjs/common';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { hashToken } from '../utils/token.util';

@Injectable()
export class LogoutUseCase {
  constructor(private readonly refreshTokenRepository: RefreshTokenRepository) {}

  async execute(refreshTokenPlano: string): Promise<void> {
    const tokenHash = hashToken(refreshTokenPlano);
    const refreshToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (refreshToken && !refreshToken.revoked_at) {
      await this.refreshTokenRepository.revoke(refreshToken.id);
    }
  }
}