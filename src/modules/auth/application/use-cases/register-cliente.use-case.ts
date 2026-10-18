import { Injectable, Logger } from '@nestjs/common';
import { PersonaRepository } from '../../../../modules/persons/domain/repositories/persona.repository';
import { UserRepository } from '../../../../modules/persons/domain/repositories/user.repository';
import { RolRepository } from '../../../../modules/persons/domain/repositories/rol.repository';
import { RegistroRepository } from '../../domain/repositories/registro.repository';
import { EmailService } from '../../domain/services/email.service';
import { RegisterClienteDto } from '../dto/register-cliente.dto';
import {
  InvalidRequestError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../domain/errors/auth-domain.errors';
import { hashPassword } from '../utils/password.util';
import {
  esFechaFutura,
  tipoClienteSegunDocumento,
} from '../utils/registro-cliente.util';
import { generateRandomToken } from '../utils/token.util';
import { TipoCliente } from '../../../../modules/persons/domain/enums/persons.enums';
import { RegistroClienteResult } from '../../domain/repositories/types/registro-repository.types';

// por el momento
const ROL_CLIENTE = 'cliente';
const HORAS_EXPIRACION_TOKEN_EMAIL = 24;

@Injectable()
export class RegisterClienteUseCase {
  private readonly logger = new Logger(RegisterClienteUseCase.name);
  constructor(
    private readonly personaRepository: PersonaRepository,
    private readonly userRepository: UserRepository,
    private readonly rolRepository: RolRepository,
    private readonly registroRepository: RegistroRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(dto: RegisterClienteDto): Promise<RegistroClienteResult> {
    // HU-B-002 (RF-B06): los datos que se piden dependen del documento.
    const tipoEsperado = tipoClienteSegunDocumento(
      dto.tipo_documento,
      dto.numero_documento,
    );
    if (!tipoEsperado) {
      throw new InvalidRequestError(
        'El RUC debe empezar con 10 (persona natural) o con 20 (empresa)',
      );
    }
    if (dto.tipo_cliente !== tipoEsperado) {
      throw new InvalidRequestError(
        tipoEsperado === TipoCliente.EMPRESA
          ? 'Con un RUC 20 debes registrarte como empresa'
          : 'Con este documento debes registrarte como persona natural',
      );
    }
    if (dto.fecha_nacimiento && esFechaFutura(dto.fecha_nacimiento)) {
      throw new InvalidRequestError(
        'La fecha de nacimiento no puede ser futura',
      );
    }
    if (tipoEsperado === TipoCliente.EMPRESA && !dto.razon_social?.trim()) {
      throw new InvalidRequestError(
        'La razón social es obligatoria para una empresa',
      );
    }

    // validaciones para duplicados
    if (await this.personaRepository.existsByDocument(dto.numero_documento)) {
      throw new ResourceConflictError(
        'Ya existe una cuenta con ese número de documento',
      );
    }
    if (await this.userRepository.existsByEmail(dto.email)) {
      throw new ResourceConflictError(
        'Ya existe una cuenta con ese correo electrónico',
      );
    }
    if (await this.userRepository.existsByUsername(dto.username)) {
      throw new ResourceConflictError('Ese nombre de usuario ya está en uso');
    }

    // validacion para rol
    const rolCliente = await this.rolRepository.findByName(ROL_CLIENTE);
    if (!rolCliente) {
      throw new ResourceNotFoundError('El rol no esta configurado');
    }

    // Preparar credenciales
    const contrasenaHash = await hashPassword(dto.password);
    const tokenVerificacion = generateRandomToken();
    const expiracionToken = new Date(
      Date.now() + HORAS_EXPIRACION_TOKEN_EMAIL * 60 * 60 * 1000,
    );

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
      },
      cliente: {
        tipo_cliente: dto.tipo_cliente,
        razon_social: dto.razon_social ?? null,
        categoria_cliente: dto.categoria_cliente,
      },
      user: {
        email: dto.email,
        username: dto.username,
        contrasena_hash: contrasenaHash,
        email_verificado: false,
        debe_cambiar_contrasena: false,
        token_verificacion_email: tokenVerificacion,
        token_verificacion_email_expiracion: expiracionToken,
      },
      rol_id: rolCliente.id,
    });

    // Correo de verificación — no bloqueante (si falla, no revierte el registro)
    try {
      await this.emailService.sendVerificationEmail({
        to: resultado.user.email,
        nombre: resultado.persona.nombres,
        verificationToken: tokenVerificacion,
        frontend: 'tienda',
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar el correo de verificación a ${resultado.user.email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return resultado;
  }
}
