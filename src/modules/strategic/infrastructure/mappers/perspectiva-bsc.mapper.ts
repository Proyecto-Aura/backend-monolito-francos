import { PerspectivaBsc as PrismaPerspectivaBsc } from '@prisma/client';
import { PerspectivaBscEntity } from '../../domain/entities';

export class PerspectivaBscMapper {
  static toDomain(perspectiva: PrismaPerspectivaBsc): PerspectivaBscEntity {
    return new PerspectivaBscEntity(
      perspectiva.id,
      perspectiva.nombre,
      perspectiva.descripcion,
      perspectiva.orden,
      perspectiva.estado,
    );
  }
}
