import { RelacionOe as PrismaRelacionOe } from '@prisma/client';
import { RelacionOeEntity } from '../../domain/entities';

export class RelacionOeMapper {
  static toDomain(relacion: PrismaRelacionOe): RelacionOeEntity {
    return new RelacionOeEntity(
      relacion.id,
      relacion.origen_id,
      relacion.destino_id,
      relacion.estado,
    );
  }
}
