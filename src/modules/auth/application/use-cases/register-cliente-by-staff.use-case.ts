import { Injectable, Logger } from '@nestjs/common';
import { PersonaRepository } from '../../../persons/domain/repositories/persona.repository';
import { RolRepository } from '../../../persons/domain/repositories/rol.repository';
import { UserRepository } from '../../../persons/domain/repositories/user.repository';
import { UbigeoRepository } from '../../../persons/domain/repositories/ubigeo.repository';
import { RegistroRepository } from '../../domain/repositories/registro.repository';
import { EmailService } from '../../domain/services/email.service';
import {
  InvalidRequestError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../domain/errors/auth-domain.errors';
import { RegisterClienteByStaffDto } from '../dto/register-cliente-by-staff.dto';
import {
  CategoriaCliente,
  TipoCliente,
} from '../../../../modules/persons/domain/enums/persons.enums';
import { buildDefaultCredentials } from '../utils/default-credentials.util';
import { RegistroClienteResult } from '../../domain/repositories/types/registro-repository.types';

// por el momento
const ROL_CLIENTE = 'cliente';

@Injectable()
export class RegisterClienteByStaffUseCase {
  private readonly logger = new Logger(RegisterClienteByStaffUseCase.name);
  constructor(
    private readonly personaRepository: PersonaRepository,
    private readonly userRepository: UserRepository,
    private readonly rolRepository: RolRepository,
    private readonly registroRepository: RegistroRepository,
    private readonly emailService: EmailService,
    private readonly ubigeoRepository: UbigeoRepository,
  ) {}
  async execute(
    dto: RegisterClienteByStaffDto,
  ): Promise<RegistroClienteResult> {
    if (
      dto.distrito_id !== undefined &&
      !(await this.ubigeoRepository.existsDistrito(dto.distrito_id))
    ) {
      throw new InvalidRequestError('El distrito indicado no existe');
    }
    // validaciones para duplicados
    if (await this.personaRepository.existsByDocument(dto.numero_documento)) {
      throw new ResourceConflictError(
        'Existe una persona con ese mismo numero de documento',
      );
    }
    if (await this.userRepository.existsByEmail(dto.email)) {
      throw new ResourceConflictError('Existe un usuario con ese mismo email');
    }
    if (dto.tipo_cliente === TipoCliente.EMPRESA && !dto.razon_social) {
      throw new ResourceConflictError(
        'La razón social es obligatoria para un cliente empresa',
      );
    }
    // validacion para rol
    const rolCliente = await this.rolRepository.findByName(ROL_CLIENTE);
    if (!rolCliente) {
      throw new ResourceNotFoundError('El rol no esta configurado');
    }

    const default_credentials = await buildDefaultCredentials(
      dto.numero_documento,
    );

    if (await this.userRepository.existsByUsername(dto.numero_documento)) {
      throw new ResourceConflictError(
        'Ya existe un usuario con ese nombre de usuario',
      );
    }

    //transaccion atomica
    const resultado = await this.registroRepository.registerCliente({
      persona: {
        nombres: dto.nombres,
        apellido_paterno: dto.apellido_paterno,
        apellido_materno: dto.apellido_materno,
        tipo_documento: dto.tipo_documento,
        numero_documento: dto.numero_documento,
        telefono: dto.telefono ?? null,
        fecha_nacimiento: dto.fecha_nacimiento
          ? new Date(dto.fecha_nacimiento)
          : null,
        direccion: dto.direccion ?? null,
        distrito_id: dto.distrito_id ?? null,
      },
      cliente: {
        tipo_cliente: dto.tipo_cliente,
        razon_social: dto.razon_social ?? null,
        categoria_cliente: dto.categoria_cliente ?? CategoriaCliente.MINORISTA,
      },
      user: {
        email: dto.email,
        username: default_credentials.username,
        contrasena_hash: default_credentials.contrasenaHash,
        email_verificado: default_credentials.emailVerificado,
        debe_cambiar_contrasena: default_credentials.debeCambiarContrasena,
        token_verificacion_email:
          default_credentials.tokenVerificacionEmailHash,
        token_verificacion_email_expiracion:
          default_credentials.tokenVerificacionEmailExpiracion,
      },
      rol_id: rolCliente.id,
    });

    try {
      await this.emailService.sendClienteBienvenidaEmail({
        to: resultado.user.email,
        nombre: resultado.persona.nombres,
        username: default_credentials.username,
        contrasenaDefault: default_credentials.contrasenaPlana,
        verificationToken: default_credentials.tokenVerificacionEmailPlano,
      });
    } catch (error) {
      this.logger.warn(
        'No se pudo enviar el correo de verificación',
        error instanceof Error ? error.stack : undefined,
      );
    }
    return resultado;
  }
}
