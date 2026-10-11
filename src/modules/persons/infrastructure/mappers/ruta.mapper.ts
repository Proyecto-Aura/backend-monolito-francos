import { Ruta as PrismaRuta } from '@prisma/client';
import { RutaEntity } from '../../domain/entities/ruta.entity';

export class RutaMapper {
  static toDomain(ruta: PrismaRuta): RutaEntity {
    return new RutaEntity(
      ruta.id,
      ruta.nombre,
      ruta.etiqueta,
      ruta.icono,
      ruta.descripcion,
      ruta.estado,
      ruta.parent_id,
      ruta.created_at,
      ruta.updated_at,
    );
  }
}
