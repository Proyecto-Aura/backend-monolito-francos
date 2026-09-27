import { Rol as PrismaRol } from '@prisma/client';
import { RolEntity } from '../../domain/entities';

export class RolMapper {
  static toDomain(rol: PrismaRol): RolEntity {
    return new RolEntity(
      rol.id,
      rol.nombre,
      rol.descripcion,
      rol.estado,
      rol.created_at,
      rol.updated_at,
    );
  }
}
