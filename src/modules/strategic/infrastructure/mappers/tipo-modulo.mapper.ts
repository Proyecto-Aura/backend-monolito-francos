import { TipoModulo as PrismaTipoModulo } from '@prisma/client';
import { TipoModuloEntity } from '../../domain/entities';

export class TipoModuloMapper {
  static toDomain(tipoModulo: PrismaTipoModulo): TipoModuloEntity {
    return new TipoModuloEntity(
      tipoModulo.id,
      tipoModulo.codigo,
      tipoModulo.nombre,
      tipoModulo.estado,
    );
  }
}
