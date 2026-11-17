import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { envs } from '../../../../config/envs';
import {
  EnvioComprobanteParams,
  EnvioComprobanteService,
} from '../../domain/services/envio-comprobante.service';
import { plantillaComprobante } from './comprobante-email.template';

@Injectable()
export class NodemailerEnvioComprobanteService implements EnvioComprobanteService {
  // Misma cuenta SMTP que el resto de correos del sistema.
  private readonly transporter = nodemailer.createTransport({
    host: envs.smtpHost,
    port: envs.smtpPort,
    secure: envs.smtpSecure,
    auth: { user: envs.smtpUser, pass: envs.smtpPass },
  });

  async enviar(params: EnvioComprobanteParams): Promise<void> {
    const { subject, html } = plantillaComprobante(params);
    await this.transporter.sendMail({
      from: envs.smtpFrom,
      to: params.to,
      subject,
      html,
    });
  }
}
