import { Injectable, Logger } from '@nestjs/common';
import { PersonaRepository } from '../../../persons/domain/repositories/persona.repository';
import { UserRepository } from '../../../persons/domain/repositories/user.repository';
import { PasswordResetRepository } from '../../domain/repositories/password-reset.repository';
import { EmailService } from '../../domain/services/email.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { generateRandomToken, hashToken } from '../utils/token.util';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const RESET_COOLDOWN_MS = 60 * 1000;

@Injectable()
export class RequestPasswordResetUseCase {
  private readonly logger = new Logger(RequestPasswordResetUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly personaRepository: PersonaRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user || !user.estado || this.isInCooldown(user.token_expiracion)) {
      return;
    }

    const resetToken = generateRandomToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await this.passwordResetRepository.saveToken(
      user.id,
      hashToken(resetToken),
      expiresAt,
    );

    try {
      const persona = await this.personaRepository.findById(user.persona_id);
      await this.emailService.sendPasswordResetEmail({
        to: user.email,
        nombre: persona?.nombres ?? 'usuario',
        resetToken,
      });
    } catch {
      this.logger.warn(
        'No se pudo enviar el correo de recuperación de contraseña',
      );
    }
  }

  private isInCooldown(tokenExpiration: Date | null): boolean {
    if (!tokenExpiration) {
      return false;
    }

    const issuedAt = tokenExpiration.getTime() - RESET_TOKEN_TTL_MS;
    return Date.now() - issuedAt < RESET_COOLDOWN_MS;
  }
}
