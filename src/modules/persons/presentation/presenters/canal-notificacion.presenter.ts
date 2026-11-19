import { envs } from '../../../../config/envs';
import { CanalNotificacionEntity } from '../../domain/entities/canal-notificacion.entity';
import { CanalNotificacionTipo } from '../../domain/enums/persons.enums';

export class CanalNotificacionPresenter {
  static toHttp(canal: CanalNotificacionEntity) {
    // remitente/servidor_smtp/seguridad del canal email no se guardan: se
    // calculan en vivo desde la configuración SMTP real (.env local o SES en
    // AWS), para que nunca queden desactualizados frente a lo que de verdad
    // se usa al enviar.
    const esEmail = canal.tipo === CanalNotificacionTipo.EMAIL;
    return {
      tipo: canal.tipo,
      activo: canal.activo,
      remitente: esEmail ? envs.smtpFrom : null,
      servidor_smtp: esEmail ? envs.smtpHost : null,
      seguridad: esEmail ? (envs.smtpSecure ? 'TLS' : 'STARTTLS') : null,
      destinatarios: canal.destinatarios,
      updated_at: canal.updated_at,
    };
  }

  static listToHttp(canales: CanalNotificacionEntity[]) {
    return canales.map((canal) => this.toHttp(canal));
  }
}
