import { Categoria as PrismaCategoria } from '@prisma/client';
import { CategoriaEntity } from '../../domain/entities';
export class CategoriaMapper {
  static toDomain(categoria: PrismaCategoria): CategoriaEntity {
    return new CategoriaEntity(
      categoria.id,
      categoria.nombre,
      categoria.descripcion,
      categoria.estado,
      categoria.created_at,
      categoria.updated_at,
    );
  }
}
