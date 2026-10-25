import { Injectable, Logger } from '@nestjs/common';
import { PersonaRepository } from '../../../persons/domain/repositories/persona.repository';
import { UserRepository } from '../../../persons/domain/repositories/user.repository';
import { UsuarioRolRepository } from '../../../persons/domain/repositories/usuario-rol.repository';
import { EmailVerificationRepository } from '../../domain/repositories/email-verification.repository';
import { EmailService } from '../../domain/services/email.service';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import {
  EMAIL_VERIFICATION_TTL_MS,
  buildEmailVerificationToken,
  resolveFrontendDestino,
} from '../utils/email-verification.util';

const COOLDOWN_MS = 60 * 1000;

@Injectable()
export class ResendVerificationUseCase {
  private readonly logger = new Logger(ResendVerificationUseCase.name);
  constructor(
    private readonly userRepository: UserRepository,
    private readonly personaRepository: PersonaRepository,
    private readonly usuarioRolRepository: UsuarioRolRepository,
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(dto: ResendVerificationDto): Promise<void> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (
      !user ||
      !user.estado ||
      user.email_verificado ||
      this.isInCooldown(user.token_verificacion_email_expiracion)
    )
      return;
    const verification = buildEmailVerificationToken();
    await this.emailVerificationRepository.saveToken(
      user.id,
      verification.tokenHash,
      verification.expiresAt,
    );
    try {
      const [persona, roles] = await Promise.all([
        this.personaRepository.findById(user.persona_id),
        this.usuarioRolRepository.findRolesByUserId(user.id),
      ]);
      await this.emailService.sendVerificationEmail({
        to: user.email,
        nombre: persona?.nombres ?? 'usuario',
        verificationToken: verification.token,
        frontend: resolveFrontendDestino(roles),
      });
    } catch {
      this.logger.warn('No se pudo enviar el correo de verificación');
    }
  }

  private isInCooldown(expiresAt: Date | null): boolean {
    return Boolean(
      expiresAt &&
      Date.now() - (expiresAt.getTime() - EMAIL_VERIFICATION_TTL_MS) <
        COOLDOWN_MS,
    );
  }
}
