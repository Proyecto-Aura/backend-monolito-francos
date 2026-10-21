import { Insumo as PrismaInsumo } from '@prisma/client';
import { InsumoEntity } from '../../domain/entities';
import { TipoInsumo, UnidadMedidaInsumo } from '../../domain/enums';

export class InsumoMapper {
  static toDomain(insumo: PrismaInsumo): InsumoEntity {
    return new InsumoEntity(
      insumo.id,
      insumo.sku,
      insumo.nombre,
      insumo.descripcion,
      insumo.unidad_medida as UnidadMedidaInsumo,
      insumo.stock_actual.toNumber(),
      insumo.stock_minimo.toNumber(),
      insumo.stock_maximo.toNumber(),
      insumo.tipo as TipoInsumo,
      insumo.estado,
      insumo.created_at,
      insumo.updated_at,
    );
  }
}
