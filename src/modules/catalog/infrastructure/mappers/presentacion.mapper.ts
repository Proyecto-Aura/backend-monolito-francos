import { Presentacion as PrismaPresentacion } from '@prisma/client';
import { PresentacionEntity } from '../../domain/entities';
import { UnidadMedidaPresentacion } from '../../domain/enums/medidas.enums';

export class PresentacionMapper {
  static toDomain(presentacion: PrismaPresentacion): PresentacionEntity {
    return new PresentacionEntity(
      presentacion.id,
      presentacion.cantidad,
      presentacion.unidad_medida as UnidadMedidaPresentacion,
      presentacion.descripcion,
      presentacion.estado,
      presentacion.created_at,
      presentacion.updated_at,
    );
  }
}
