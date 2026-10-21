import { Injectable } from '@nestjs/common';
import { PasswordResetRepository } from '../../domain/repositories/password-reset.repository';
import { InvalidResetTokenError } from '../../domain/errors/auth-domain.errors';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { hashPassword } from '../utils/password.util';
import { hashToken } from '../utils/token.util';

const INVALID_RESET_TOKEN_MESSAGE =
  'El enlace de recuperación es inválido o ha expirado';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly passwordResetRepository: PasswordResetRepository,
  ) {}

  async execute(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const user =
      await this.passwordResetRepository.findUserByTokenHash(tokenHash);

    if (
      !user ||
      !user.estado ||
      !user.token_expiracion ||
      user.token_expiracion <= new Date()
    ) {
      throw new InvalidResetTokenError(INVALID_RESET_TOKEN_MESSAGE);
    }

    const wasReset = await this.passwordResetRepository.resetPassword({
      userId: user.id,
      tokenHash,
      contrasenaHash: await hashPassword(dto.nueva_contrasena),
    });

    if (!wasReset) {
      throw new InvalidResetTokenError(INVALID_RESET_TOKEN_MESSAGE);
    }
  }
}
