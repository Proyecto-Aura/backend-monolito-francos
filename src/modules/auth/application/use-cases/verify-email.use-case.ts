import { Injectable } from '@nestjs/common';
import { InvalidVerificationTokenError } from '../../domain/errors/auth-domain.errors';
import { EmailVerificationRepository } from '../../domain/repositories/email-verification.repository';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { hashToken } from '../utils/token.util';

const INVALID_TOKEN_MESSAGE =
  'El enlace de verificación es inválido o ha expirado';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    private readonly emailVerificationRepository: EmailVerificationRepository,
  ) {}

  async execute(dto: VerifyEmailDto): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const user =
      await this.emailVerificationRepository.findUserByTokenHash(tokenHash);
    if (
      !user ||
      !user.estado ||
      !user.token_verificacion_email_expiracion ||
      user.token_verificacion_email_expiracion <= new Date()
    ) {
      throw new InvalidVerificationTokenError(INVALID_TOKEN_MESSAGE);
    }
    if (
      !(await this.emailVerificationRepository.verifyEmail({
        userId: user.id,
        tokenHash,
      }))
    ) {
      throw new InvalidVerificationTokenError(INVALID_TOKEN_MESSAGE);
    }
  }
}
