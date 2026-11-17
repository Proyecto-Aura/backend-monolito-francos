import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { CreateRefreshTokenParams } from '../../domain/repositories/types/refresh-token-repository.types';
import { Injectable } from '@nestjs/common';
import { RefreshTokenMapper } from '../mappers/refresh-token.mapper';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateRefreshTokenParams): Promise<RefreshTokenEntity> {
    const refresh_token = await this.prisma.refreshToken.create({
      data: params,
    });
    return RefreshTokenMapper.toDomain(refresh_token);
  }
  async findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    const refresh_token = await this.prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
    });
    return refresh_token ? RefreshTokenMapper.toDomain(refresh_token) : null;
  }
  async findById(id: string): Promise<RefreshTokenEntity | null> {
    const refresh_token = await this.prisma.refreshToken.findUnique({
      where: { id },
    });
    return refresh_token ? RefreshTokenMapper.toDomain(refresh_token) : null;
  }
  async revoke(id: string): Promise<RefreshTokenEntity> {
    const refresh_token = await this.prisma.refreshToken.update({
      data: { revoked_at: new Date() },
      where: { id },
    });
    return RefreshTokenMapper.toDomain(refresh_token);
  }
}
