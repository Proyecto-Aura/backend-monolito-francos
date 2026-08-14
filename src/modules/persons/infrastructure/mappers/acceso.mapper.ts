import { Acceso as PrismaAcceso } from '@prisma/client';
import { AccesoEntity } from '../../domain/entities/acceso.entity';

export class AccesoMapper {
  static toDomain(acceso: PrismaAcceso): AccesoEntity {
    return new AccesoEntity(
      acceso.id,
      acceso.rol_id,
      acceso.ruta_id,
      acceso.estado,
      acceso.created_at,
      acceso.updated_at,
    );
  }
}
