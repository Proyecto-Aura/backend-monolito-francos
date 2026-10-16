import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { UserMapper } from '../../../persons/infrastructure/mappers/user.mapper';
import { PasswordResetRepository } from '../../domain/repositories/password-reset.repository';
import { ResetPasswordParams } from '../../domain/repositories/types/password-reset-repository.types';

@Injectable()
export class PrismaPasswordResetRepository implements PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        token_recuperacion: tokenHash,
        token_expiracion: expiresAt,
      },
    });
  }

  async findUserByTokenHash(tokenHash: string) {
    const user = await this.prisma.user.findFirst({
      where: { token_recuperacion: tokenHash },
    });
    return user ? UserMapper.toDomain(user) : null;
  }

  async resetPassword(params: ResetPasswordParams): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: {
          id: params.userId,
          token_recuperacion: params.tokenHash,
        },
        data: {
          contrasena: params.contrasenaHash,
          token_recuperacion: null,
          token_expiracion: null,
          debe_cambiar_contrasena: false,
        },
      });

      if (result.count === 0) {
        return false;
      }

      await tx.refreshToken.updateMany({
        where: { user_id: params.userId, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      return true;
    });
  }
}
