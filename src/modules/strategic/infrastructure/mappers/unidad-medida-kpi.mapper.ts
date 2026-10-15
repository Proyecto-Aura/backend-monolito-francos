import { UnidadMedidaKpi } from '@prisma/client';
import { UnidadMedidaKpiEntity } from '../../domain/entities';

export class UnidadMedidaKpiMapper {
  static toDomain(unidad: UnidadMedidaKpi): UnidadMedidaKpiEntity {
    return new UnidadMedidaKpiEntity(
      unidad.id,
      unidad.nombre,
      unidad.simbolo,
      unidad.decimales,
      unidad.estado,
      unidad.created_at,
      unidad.updated_at,
    );
  }
}
