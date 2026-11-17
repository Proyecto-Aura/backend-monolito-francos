import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../../../../auth/domain/services/email.service';
import {
  generateRandomToken,
  hashToken,
} from '../../../../auth/application/utils/token.util';
import { ResourceConflictError } from '../../../domain/errors/persons-domain.errors';
import { SolicitudCambioEmailRepository } from '../../../domain/repositories/solicitud-cambio-email.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { UpdatePerfilDto } from '../../dto/perfil-dtos/update-perfil.dto';
import { GetPerfilUseCase, PerfilCliente } from './get-perfil.use-case';

const TOKEN_TTL_MS = 60 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const FRONTEND_CLIENTE = 'tienda' as const;

export interface UpdatePerfilResult {
  perfil: PerfilCliente;
  cambioEmailPendiente: boolean;
}

// HU-B-015 (RF-B43): el cliente edita su nombre, email y teléfono.
// HU-B-016 (RF-B44): si el email cambia, no se aplica: se envía un enlace de
// verificación a la dirección nueva y el cambio se confirma en otro endpoint.
@Injectable()
export class UpdatePerfilUseCase {
  private readonly logger = new Logger(UpdatePerfilUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly solicitudCambioEmailRepository: SolicitudCambioEmailRepository,
    private readonly emailService: EmailService,
    private readonly getPerfil: GetPerfilUseCase,
  ) {}

  async execute(
    userId: string,
    dto: UpdatePerfilDto,
  ): Promise<UpdatePerfilResult> {
    const { user, persona } = await this.getPerfil.execute(userId);

    let pendiente = await this.solicitudCambioEmailRepository.findByUserId(
      user.id,
    );
    if (pendiente && pendiente.expira_at <= new Date()) {
      await this.solicitudCambioEmailRepository.deleteByUserId(user.id);
      pendiente = null;
    }

    const emailNuevo = dto.email?.trim().toLowerCase();
    const cambiaEmail =
      emailNuevo !== undefined &&
      emailNuevo !== user.email.trim().toLowerCase();

    if (cambiaEmail) {
      if (await this.userRepository.existsByEmail(emailNuevo, user.id)) {
        throw new ResourceConflictError(
          'Ese correo ya está registrado en otra cuenta',
        );
      }

      const enCooldown =
        pendiente !== null &&
        Date.now() - pendiente.created_at.getTime() < COOLDOWN_MS;

      if (!enCooldown) {
        const token = generateRandomToken();
        await this.solicitudCambioEmailRepository.save(
          user.id,
          emailNuevo,
          hashToken(token),
          new Date(Date.now() + TOKEN_TTL_MS),
        );

        try {
          await this.emailService.sendEmailChangeVerificationEmail({
            to: emailNuevo,
            nombre: persona.nombres,
            token,
            frontend: FRONTEND_CLIENTE,
          });
        } catch {
          this.logger.warn(
            'No se pudo enviar el correo de verificación del cambio de email',
          );
        }
      }
    }

    if (dto.nombres !== undefined || dto.telefono !== undefined) {
      await this.userRepository.updateWithPersona(
        user.id,
        {},
        { nombres: dto.nombres, telefono: dto.telefono },
      );
    }

    return {
      perfil: await this.getPerfil.execute(userId),
      cambioEmailPendiente: cambiaEmail || pendiente !== null,
    };
  }
}
