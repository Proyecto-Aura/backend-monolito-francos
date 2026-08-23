import { Injectable, Logger } from "@nestjs/common";
import { PersonaRepository } from '../../../../modules/persons/domain/repositories/persona.repository';
import { UserRepository } from '../../../../modules/persons/domain/repositories/user.repository';
import { RolRepository } from '../../../../modules/persons/domain/repositories/rol.repository';
import { RegistroRepository } from "../../domain/repositories/registro.repository";
import { EmailService } from "../../domain/services/email.service";
import { RegisterClienteDto } from "../dto/register-cliente.dto";
import { ResourceConflictError, ResourceNotFoundError } from "../../domain/errors/auth-domain.errors";
import { hashPassword } from "../utils/password.util";
import { generateRandomToken } from "../utils/token.util";
import {
    TipoDocumento,
    TipoCliente,
    CategoriaCliente,
} from '../../../../modules/persons/domain/enums/persons.enums';
import { RegistroClienteResult } from "../../domain/repositories/types/registro-repository.types";

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
    ) { }

    async execute(dto: RegisterClienteDto): Promise<RegistroClienteResult> {
        // validaciones para duplicados
        if (await this.personaRepository.existsByDocument(dto.numero_documento)) {
            throw new ResourceConflictError("Existe una persona con ese mismo numero de documento");
        }
        if (await this.userRepository.existsByEmail(dto.email)) {
            throw new ResourceConflictError("Existe un usuario con ese mismo email");
        }
        if (dto.tipo_cliente === TipoCliente.EMPRESA && !dto.razon_social) {
            throw new ResourceConflictError('La razón social es obligatoria para un cliente empresa');
        }
        if (await this.userRepository.existsByUsername(dto.username)) {
            throw new ResourceConflictError("Existe un usuario con ese mismo nombre")
        }

        // validacion para rol
        const rolCliente = await this.rolRepository.findByName(ROL_CLIENTE)
        if (!rolCliente) {
            throw new ResourceNotFoundError("El rol no esta configurado")
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
                tipo_documento: dto.tipo_documento as TipoDocumento,
                numero_documento: dto.numero_documento,
                telefono: dto.telefono ?? null,
                fecha_nacimiento: dto.fecha_nacimiento ? new Date(dto.fecha_nacimiento) : null,
                direccion: dto.direccion ?? null,
            },
            cliente: {
                tipo_cliente: dto.tipo_cliente as TipoCliente,
                razon_social: dto.razon_social ?? null,
                categoria_cliente: dto.categoria_cliente as CategoriaCliente,
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