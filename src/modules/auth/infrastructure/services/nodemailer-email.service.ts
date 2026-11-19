import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import { PlantillaNotificacionClave } from '@prisma/client';
import { envs } from '../../../../config/envs';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { EmailService } from '../../domain/services/email.service';
import {
  SendVerificationEmailParams,
  SendDefaultCredentialsEmailParams,
  SendPasswordResetEmailParams,
  SendEmailChangeVerificationEmailParams,
  FrontendDestino,
  SendClienteBienvenidaEmailParams,
} from '../../domain/services/types/email-service.types';

@Injectable()
export class NodemailerEmailService implements EmailService {
  private readonly logger = new Logger(NodemailerEmailService.name);

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

  constructor(private readonly prisma: PrismaService) {}

  // FNC-43 (RF-A185): si el admin desactivó el canal "email", no se envía
  // nada. No lanza error: el flujo de negocio que originó el correo (login,
  // registro, etc.) no debe romperse porque el canal esté apagado.
  private async enviarSiCanalActivo(mensaje: Mail.Options): Promise<void> {
    const canal = await this.prisma.canalNotificacion.findUnique({
      where: { tipo: 'email' },
    });
    if (canal && !canal.activo) {
      this.logger.warn(
        `Canal de email desactivado: no se envió "${String(mensaje.subject)}" a ${JSON.stringify(mensaje.to) ?? ''}`,
      );
      return;
    }
    await this.transporter.sendMail(mensaje);
  }

  // FNC-43 (RF-A187): asunto y cuerpo salen de la plantilla editable por el
  // admin (persons.plantilla_notificacion). Si por algún motivo la fila no
  // existe, se usa el texto por defecto pasado en `fallback` para que el
  // flujo de negocio (login, registro, etc.) nunca se rompa por esto.
  private async renderizarPlantilla(
    clave: PlantillaNotificacionClave,
    variables: Record<string, string>,
    fallback: { subject: string; html: string },
  ): Promise<{ subject: string; html: string }> {
    const plantilla = await this.prisma.plantillaNotificacion.findUnique({
      where: { clave },
    });
    if (!plantilla) {
      return fallback;
    }
    const interpolar = (texto: string) =>
      texto.replace(
        /\{\{\s*([a-z0-9_]+)\s*\}\}/gi,
        (coincidencia: string, nombre: string) =>
          Object.prototype.hasOwnProperty.call(variables, nombre)
            ? variables[nombre]
            : coincidencia,
      );
    return {
      subject: interpolar(plantilla.asunto),
      html: interpolar(plantilla.cuerpo),
    };
  }

  // Envía el correo con el link para confirmar el email del usuario.
  async sendVerificationEmail(
    params: SendVerificationEmailParams,
  ): Promise<void> {
    // Link que el usuario abrirá desde el correo (lo maneja el frontend).
    const url = `${this.getFrontendUrl(params.frontend)}/verify-email?token=${params.verificationToken}`;

    const { subject, html } = await this.renderizarPlantilla(
      'verificacion_email',
      { nombre: params.nombre, enlace: url },
      {
        subject: "Verifica tu correo — Franco's",
        html: `<p>Hola ${params.nombre}, confirma tu correo haciendo clic aquí: <a href="${url}">${url}</a></p>`,
      },
    );
    await this.enviarSiCanalActivo({
      from: envs.smtpFrom,
      to: params.to,
      subject,
      html,
    });
  }

  // Envía el correo con usuario/contraseña por defecto (cliente-por-staff y empleado).
  async sendDefaultCredentialsEmail(
    params: SendDefaultCredentialsEmailParams,
  ): Promise<void> {
    const { subject, html } = await this.renderizarPlantilla(
      'credenciales_usuario_interno',
      {
        nombre: params.nombre,
        username: params.username,
        contrasena_temporal: params.contrasenaDefault,
      },
      {
        subject: "Tus credenciales de acceso — Franco's",
        html: `<p>Hola ${params.nombre}, tu usuario es <b>${params.username}</b> y tu contraseña temporal es <b>${params.contrasenaDefault}</b>. Deberás cambiarla al iniciar sesión.</p>`,
      },
    );
    await this.enviarSiCanalActivo({
      from: envs.smtpFrom,
      to: params.to,
      subject,
      html,
    });
  }

  async sendClienteBienvenidaEmail(
    params: SendClienteBienvenidaEmailParams,
  ): Promise<void> {
    const nombre = this.escapeHtml(params.nombre);
    const username = this.escapeHtml(params.username);
    const contrasena = this.escapeHtml(params.contrasenaDefault);
    const url = `${this.getFrontendUrl('tienda')}/verify-email?token=${params.verificationToken}`;
    const { subject, html } = await this.renderizarPlantilla(
      'bienvenida_cliente',
      {
        nombre,
        username,
        contrasena_temporal: contrasena,
        enlace: url,
      },
      {
        subject: "Bienvenido a Franco's — verifica tu correo",
        html: `<p>Hola ${nombre}, tu usuario es <b>${username}</b> y tu contraseña temporal es <b>${contrasena}</b>. Deberás cambiarla al iniciar sesión.</p><p>Verifica tu correo aquí: <a href="${url}">${url}</a></p><p>El enlace vence en 24 horas.</p><p>Si no solicitaste esta cuenta, puedes ignorar este correo.</p>`,
      },
    );
    await this.enviarSiCanalActivo({
      from: envs.smtpFrom,
      to: params.to,
      subject,
      html,
    });
  }

  async sendPasswordResetEmail(
    params: SendPasswordResetEmailParams,
  ): Promise<void> {
    const url = `${this.getFrontendUrl(params.frontend)}/reset-password?token=${params.resetToken}`;
    const nombre = this.escapeHtml(params.nombre);

    const { subject, html } = await this.renderizarPlantilla(
      'recuperar_contrasena',
      { nombre, enlace: url, vigencia: '1 hora' },
      {
        subject: "Restablece tu contraseña — Franco's",
        html: `<p>Hola ${nombre}, recibimos una solicitud para restablecer tu contraseña.</p><p>Usa este enlace: <a href="${url}">${url}</a></p><p>El enlace vence en 1 hora.</p><p>Si no solicitaste este cambio, puedes ignorar este correo.</p>`,
      },
    );
    await this.enviarSiCanalActivo({
      from: envs.smtpFrom,
      to: params.to,
      subject,
      html,
    });
  }

  // HU-B-016: confirma la dirección nueva antes de cambiarla en la cuenta.
  async sendEmailChangeVerificationEmail(
    params: SendEmailChangeVerificationEmailParams,
  ): Promise<void> {
    const url = `${this.getFrontendUrl(params.frontend)}/verificar-cambio-email?token=${params.token}`;
    const nombre = this.escapeHtml(params.nombre);

    await this.enviarSiCanalActivo({
      from: envs.smtpFrom,
      to: params.to,
      subject: "Confirma tu nuevo correo — Franco's",
      html: `<p>Hola ${nombre}, recibimos una solicitud para cambiar el correo de tu cuenta.</p><p>Confírmalo con este enlace: <a href="${url}">${url}</a></p><p>El enlace vence en 1 hora.</p><p>Si no fuiste tú, ignora este correo.</p>`,
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
