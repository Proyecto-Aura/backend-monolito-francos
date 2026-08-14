import { Injectable } from '@nestjs/common';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { CategoriaEntity } from '../../../domain/entities';
import { UpdateCategoriaDto } from '../../dto/categoria-dtos/update-categoria.dto';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';

@Injectable()
export class UpdateCategoriaUseCase {
  constructor(private readonly categoriaRepository: CategoriaRepository) {}

  async execute(id: number, dto: UpdateCategoriaDto): Promise<CategoriaEntity> {
    const categoria = await this.categoriaRepository.findById(id);
    if (!categoria) {
      throw new ResourceNotFoundError('Categoría no encontrada');
    }

    if (dto.nombre && dto.nombre !== categoria.nombre) {
      const exists = await this.categoriaRepository.existsByName(
        dto.nombre,
        id,
      );
      if (exists) {
        throw new ResourceConflictError(
          'Ya existe una categoria con ese nombre',
        );
      }
    }

    return this.categoriaRepository.update(id, {
      nombre: dto.nombre,
      descripcion: dto.descripcion,
    });
  }
}
