import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { envs } from '../../../../config/envs';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  EnvioComprobanteParams,
  EnvioComprobanteService,
} from '../../domain/services/envio-comprobante.service';
import { plantillaComprobante } from './comprobante-email.template';

@Injectable()
export class NodemailerEnvioComprobanteService implements EnvioComprobanteService {
  private readonly logger = new Logger(NodemailerEnvioComprobanteService.name);

  // Misma cuenta SMTP que el resto de correos del sistema.
  private readonly transporter = nodemailer.createTransport({
    host: envs.smtpHost,
    port: envs.smtpPort,
    secure: envs.smtpSecure,
    auth: { user: envs.smtpUser, pass: envs.smtpPass },
  });

  constructor(private readonly prisma: PrismaService) {}

  async enviar(params: EnvioComprobanteParams): Promise<void> {
    // FNC-43 (RF-A185): si el admin desactivó el canal "email", no se envía.
    const canal = await this.prisma.canalNotificacion.findUnique({
      where: { tipo: 'email' },
    });
    if (canal && !canal.activo) {
      this.logger.warn(
        `Canal de email desactivado: no se envió el comprobante a ${params.to}`,
      );
      return;
    }

    const { subject, html } = plantillaComprobante(params);
    await this.transporter.sendMail({
      from: envs.smtpFrom,
      to: params.to,
      subject,
      html,
    });
  }
}
