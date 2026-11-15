import { Injectable } from '@nestjs/common';
import { hashToken } from '../../../../auth/application/utils/token.util';
import {
  InvalidEmailChangeTokenError,
  ResourceConflictError,
} from '../../../domain/errors/persons-domain.errors';
import { SolicitudCambioEmailRepository } from '../../../domain/repositories/solicitud-cambio-email.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { VerificarCambioEmailDto } from '../../dto/perfil-dtos/verificar-cambio-email.dto';

const INVALID_TOKEN_MESSAGE = 'El enlace no es válido o ya venció';

// HU-B-016 (RF-B44): confirma el correo nuevo con el token del enlace.
@Injectable()
export class VerifyEmailChangeUseCase {
  constructor(
    private readonly solicitudCambioEmailRepository: SolicitudCambioEmailRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(dto: VerificarCambioEmailDto): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const solicitud =
      await this.solicitudCambioEmailRepository.findByTokenHash(tokenHash);

    if (!solicitud) {
      throw new InvalidEmailChangeTokenError(INVALID_TOKEN_MESSAGE);
    }

    const user = await this.userRepository.findById(solicitud.user_id);
    if (!user || !user.estado) {
      await this.solicitudCambioEmailRepository.deleteByUserId(
        solicitud.user_id,
      );
      throw new InvalidEmailChangeTokenError(INVALID_TOKEN_MESSAGE);
    }

    if (solicitud.expira_at <= new Date()) {
      await this.solicitudCambioEmailRepository.deleteByUserId(user.id);
      throw new InvalidEmailChangeTokenError(INVALID_TOKEN_MESSAGE);
    }

    if (
      await this.userRepository.existsByEmail(solicitud.email_nuevo, user.id)
    ) {
      await this.solicitudCambioEmailRepository.deleteByUserId(user.id);
      throw new ResourceConflictError(
        'Ese correo ya está registrado en otra cuenta',
      );
    }

    const resultado = await this.solicitudCambioEmailRepository.applyChange(
      user.id,
      solicitud.email_nuevo,
      tokenHash,
    );

    if (resultado === 'token_invalido') {
      throw new InvalidEmailChangeTokenError(INVALID_TOKEN_MESSAGE);
    }
    if (resultado === 'email_en_uso') {
      await this.solicitudCambioEmailRepository.deleteByUserId(user.id);
      throw new ResourceConflictError(
        'Ese correo ya está registrado en otra cuenta',
      );
    }
  }
}
