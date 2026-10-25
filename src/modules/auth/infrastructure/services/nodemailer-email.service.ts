import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { envs } from '../../../../config/envs';
import { EmailService } from '../../domain/services/email.service';
import {
  SendVerificationEmailParams,
  SendDefaultCredentialsEmailParams,
  SendPasswordResetEmailParams,
  FrontendDestino,
  SendClienteBienvenidaEmailParams,
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
    const url = `${this.getFrontendUrl(params.frontend)}/verify-email?token=${params.verificationToken}`;

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

  async sendClienteBienvenidaEmail(
    params: SendClienteBienvenidaEmailParams,
  ): Promise<void> {
    const nombre = this.escapeHtml(params.nombre);
    const username = this.escapeHtml(params.username);
    const contrasena = this.escapeHtml(params.contrasenaDefault);
    const url = `${this.getFrontendUrl('tienda')}/verify-email?token=${params.verificationToken}`;
    await this.transporter.sendMail({
      from: envs.smtpFrom,
      to: params.to,
      subject: "Bienvenido a Franco's — verifica tu correo",
      html: `<p>Hola ${nombre}, tu usuario es <b>${username}</b> y tu contraseña temporal es <b>${contrasena}</b>. Deberás cambiarla al iniciar sesión.</p><p>Verifica tu correo aquí: <a href="${url}">${url}</a></p><p>El enlace vence en 24 horas.</p><p>Si no solicitaste esta cuenta, puedes ignorar este correo.</p>`,
    });
  }

  async sendPasswordResetEmail(
    params: SendPasswordResetEmailParams,
  ): Promise<void> {
    const url = `${this.getFrontendUrl(params.frontend)}/reset-password?token=${params.resetToken}`;
    const nombre = this.escapeHtml(params.nombre);

    await this.transporter.sendMail({
      from: envs.smtpFrom,
      to: params.to,
      subject: "Restablece tu contraseña — Franco's",
      html: `<p>Hola ${nombre}, recibimos una solicitud para restablecer tu contraseña.</p><p>Usa este enlace: <a href="${url}">${url}</a></p><p>El enlace vence en 1 hora.</p><p>Si no solicitaste este cambio, puedes ignorar este correo.</p>`,
    });
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      };
      return entities[character];
    });
  }

  private getFrontendUrl(frontend: FrontendDestino): string {
    return frontend === 'tienda'
      ? envs.frontendStoreUrl
      : envs.frontendPortalUrl;
  }
}
