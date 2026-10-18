import { Reembolso as PrismaReembolso } from '@prisma/client';
import { ReembolsoEntity } from '../../domain/entities';
import { EstadoReembolso } from '../../domain/enums';

export class ReembolsoMapper {
  static toDomain(reembolso: PrismaReembolso): ReembolsoEntity {
    return new ReembolsoEntity(
      reembolso.id,
      reembolso.codigo,
      reembolso.pago_id,
      reembolso.monto.toNumber(),
      reembolso.motivo_cliente,
      reembolso.evidencia_key,
      reembolso.estado as EstadoReembolso,
      reembolso.motivo_rechazo,
      reembolso.resuelto_por,
      reembolso.fecha_solicitud,
      reembolso.fecha_resolucion,
      reembolso.created_at,
      reembolso.updated_at,
    );
  }
}
