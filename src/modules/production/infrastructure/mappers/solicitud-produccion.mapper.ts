import { SolicitudProduccion as PrismaSolicitudProduccion } from '@prisma/client';
import { SolicitudProduccionEntity } from '../../domain/entities';
import { EstadoSolicitudProduccion } from '../../domain/enums';

type PrismaSolicitudProduccionConSolicitante = PrismaSolicitudProduccion & {
  _count: { detalle: number };
  solicitante: {
    persona: {
      nombres: string;
      apellido_paterno: string;
      apellido_materno: string;
    };
  };
};

export class SolicitudProduccionMapper {
  static toDomain(
    solicitud: PrismaSolicitudProduccionConSolicitante,
  ): SolicitudProduccionEntity {
    const { persona } = solicitud.solicitante;

    return new SolicitudProduccionEntity(
      solicitud.id,
      solicitud.codigo,
      solicitud.estado as EstadoSolicitudProduccion,
      solicitud.fecha_creacion,
      solicitud.fecha_limite,
      solicitud.solicitado_por,
      `${persona.nombres} ${persona.apellido_paterno} ${persona.apellido_materno}`,
      solicitud.created_at,
      solicitud.updated_at,
      solicitud._count.detalle,
    );
  }
}
