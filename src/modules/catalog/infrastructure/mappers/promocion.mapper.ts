import { Promocion as PrismaPromocion } from '@prisma/client';
import { PromocionEntity } from '../../domain/entities';
import { TipoPromocion } from '../../domain/enums';

export class PromocionMapper {
  static toDomain(promocion: PrismaPromocion): PromocionEntity {
    return new PromocionEntity(
      promocion.id,
      promocion.producto_presentacion_id,
      promocion.nombre,
      promocion.tipo as TipoPromocion,
      promocion.valor.toNumber(),
      promocion.cantidad_paga,
      promocion.cantidad_lleva,
      promocion.cantidad_minima,
      promocion.producto_presentacion_regalo_id,
      promocion.fecha_inicio,
      promocion.fecha_fin,
      promocion.estado,
      promocion.created_at,
      promocion.updated_at,
    );
  }
}
