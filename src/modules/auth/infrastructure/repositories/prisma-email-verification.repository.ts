import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { UserMapper } from '../../../persons/infrastructure/mappers/user.mapper';
import { EmailVerificationRepository } from '../../domain/repositories/email-verification.repository';
import { VerifyEmailParams } from '../../domain/repositories/types/email-verification-repository.types';

@Injectable()
export class PrismaEmailVerificationRepository implements EmailVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        token_verificacion_email: tokenHash,
        token_verificacion_email_expiracion: expiresAt,
      },
    });
  }

  async findUserByTokenHash(tokenHash: string) {
    const user = await this.prisma.user.findFirst({
      where: { token_verificacion_email: tokenHash },
    });
    return user ? UserMapper.toDomain(user) : null;
  }

  async verifyEmail(params: VerifyEmailParams): Promise<boolean> {
    const result = await this.prisma.user.updateMany({
      where: { id: params.userId, token_verificacion_email: params.tokenHash },
      data: {
        email_verificado: true,
        token_verificacion_email: null,
        token_verificacion_email_expiracion: null,
      },
    });
    return result.count > 0;
  }
}
