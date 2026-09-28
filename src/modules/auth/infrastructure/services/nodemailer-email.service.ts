import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { envs } from '../../../../config/envs';
import { EmailService } from '../../domain/services/email.service';
import {
  SendVerificationEmailParams,
  SendDefaultCredentialsEmailParams,
} from '../../domain/services/types/email-service.types';

@Injectable()
export class NodemailerEmailService implements EmailService {
  // Conexión SMTP configurada una sola vez, reutilizada en todos los envíos.
  private readonly transporter = nodemailer.createTransport({
    host: envs.smtpHost,
    port: envs.smtpPort,
    secure: envs.smtpSecure, // false en 587: usa STARTTLS automático, no TLS forzado
    auth: {
      user: envs.smtpUser,
      pass: envs.smtpPass,
    },
  });

  // Envía el correo con el link para confirmar el email del usuario.
  async sendVerificationEmail(
    params: SendVerificationEmailParams,
  ): Promise<void> {
    // Link que el usuario abrirá desde el correo (lo maneja el frontend).
    const url = `${envs.frontendUrl}/verify-email?token=${params.verificationToken}`;

    await this.transporter.sendMail({
      from: envs.smtpFrom,
      to: params.to,
      subject: "Verifica tu correo — Franco's",
      html: `<p>Hola ${params.nombre}, confirma tu correo haciendo clic aquí: <a href="${url}">${url}</a></p>`,
    });
  }

  // Envía el correo con usuario/contraseña por defecto (cliente-por-staff y empleado).
  async sendDefaultCredentialsEmail(
    params: SendDefaultCredentialsEmailParams,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: envs.smtpFrom,
      to: params.to,
      subject: "Tus credenciales de acceso — Franco's",
      html: `<p>Hola ${params.nombre}, tu usuario es <b>${params.username}</b> y tu contraseña temporal es <b>${params.contrasenaDefault}</b>. Deberás cambiarla al iniciar sesión.</p>`,
    });
  }
}
