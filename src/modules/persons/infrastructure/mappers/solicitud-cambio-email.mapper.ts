import { SolicitudCambioEmail as PrismaSolicitudCambioEmail } from '@prisma/client';
import { SolicitudCambioEmailEntity } from '../../domain/entities/solicitud-cambio-email.entity';

export class SolicitudCambioEmailMapper {
  static toDomain(
    solicitud: PrismaSolicitudCambioEmail,
  ): SolicitudCambioEmailEntity {
    return new SolicitudCambioEmailEntity(
      solicitud.id,
      solicitud.user_id,
      solicitud.email_nuevo,
      solicitud.token_hash,
      solicitud.expira_at,
      solicitud.created_at,
      solicitud.updated_at,
    );
  }
}
