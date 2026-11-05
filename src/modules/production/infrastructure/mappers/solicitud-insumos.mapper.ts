import { SolicitudInsumos as PrismaSolicitudInsumos } from '@prisma/client';
import { SolicitudInsumosEntity } from '../../domain/entities';
import { EstadoSolicitudInsumos } from '../../domain/enums';

type PrismaSolicitudInsumosConSolicitante = PrismaSolicitudInsumos & {
  _count: { detalle: number };
  solicitante: {
    persona: {
      nombres: string;
      apellido_paterno: string;
      apellido_materno: string;
    };
  };
};

export class SolicitudInsumosMapper {
  static toDomain(
    solicitud: PrismaSolicitudInsumosConSolicitante,
  ): SolicitudInsumosEntity {
    const { persona } = solicitud.solicitante;

    return new SolicitudInsumosEntity(
      solicitud.id,
      solicitud.codigo_solicitud,
      solicitud.solicitud_produccion_id,
      solicitud.estado as EstadoSolicitudInsumos,
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
