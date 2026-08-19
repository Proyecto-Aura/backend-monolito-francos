import { Injectable, Logger } from '@nestjs/common';
import { PersonaRepository } from '../../../persons/domain/repositories/persona.repository';
import { RolRepository } from '../../../persons/domain/repositories/rol.repository';
import { UserRepository } from '../../../persons/domain/repositories/user.repository';
import { RegistroRepository } from '../../domain/repositories/registro.repository';
import { EmailService } from '../../domain/services/email.service';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../domain/errors/auth-domain.errors';
import { RegisterEmpleadoDto } from '../dto/register-empleado.dto';
import { TipoDocumento } from '../../../persons/domain/enums/persons.enums';
import { buildDefaultCredentials } from '../utils/default-credentials.util';
import { RegistroEmpleadoResult } from '../../domain/repositories/types/registro-repository.types';

@Injectable()
export class RegisterEmpleadoUseCase {
  private readonly logger = new Logger(RegisterEmpleadoUseCase.name);

  constructor(
    private readonly personaRepository: PersonaRepository,
    private readonly userRepository: UserRepository,
    private readonly rolRepository: RolRepository,
    private readonly registroRepository: RegistroRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(dto: RegisterEmpleadoDto): Promise<RegistroEmpleadoResult> {
    // Validaciones de duplicados
    if (await this.personaRepository.existsByDocument(dto.numero_documento)) {
      throw new ResourceConflictError('Existe una persona con ese mismo número de documento');
    }
    if (await this.userRepository.existsByEmail(dto.email)) {
      throw new ResourceConflictError('Existe un usuario con ese mismo email');
    }
    if (await this.userRepository.existsByUsername(dto.numero_documento)) {
      throw new ResourceConflictError('Ya existe un usuario con ese nombre de usuario');
    }

    // El admin elige el rol — validamos que exista y esté activo
    const rol = await this.rolRepository.findById(dto.rol_id);
    if (!rol) {
      throw new ResourceNotFoundError('El rol seleccionado no existe');
    }
    if (!rol.estado) {
      throw new ResourceConflictError('El rol seleccionado no está activo');
    }

    // Credenciales por defecto (username=DNI, password=DNI hasheada)
    const default_credentials = await buildDefaultCredentials(dto.numero_documento);

    // Transacción atómica
    const resultado = await this.registroRepository.registerEmpleado({
      persona: {
        nombres: dto.nombres,
        apellido_paterno: dto.apellido_paterno,
        apellido_materno: dto.apellido_materno,
        tipo_documento: dto.tipo_documento as TipoDocumento,
        numero_documento: dto.numero_documento,
        telefono: dto.telefono ?? null,
        fecha_nacimiento: dto.fecha_nacimiento ? new Date(dto.fecha_nacimiento) : null,
        direccion: dto.direccion ?? null,
      },
      empleado: {
        cargo: dto.cargo,
        area: dto.area,
        fecha_ingreso: dto.fecha_ingreso ? new Date(dto.fecha_ingreso) : new Date(),
        fecha_des_lab: null,
      },
      user: {
        email: dto.email,
        username: default_credentials.username,
        contrasena_hash: default_credentials.contrasenaHash,
        email_verificado: default_credentials.emailVerificado,
        debe_cambiar_contrasena: default_credentials.debeCambiarContrasena,
        token_verificacion_email: default_credentials.tokenVerificacionEmail,
        token_verificacion_email_expiracion: default_credentials.tokenVerificacionEmailExpiracion,
      },
      rol_id: rol.id,
    });

    // Correos — no bloqueantes
    try {
      await this.emailService.sendDefaultCredentialsEmail({
        to: resultado.user.email,
        nombre: resultado.persona.nombres,
        username: default_credentials.username,
        contrasenaDefault: default_credentials.contrasenaPlana,
      });
      await this.emailService.sendVerificationEmail({
        to: resultado.user.email,
        nombre: resultado.persona.nombres,
        verificationToken: default_credentials.tokenVerificacionEmail,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar el correo a ${resultado.user.email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return resultado;
  }
}