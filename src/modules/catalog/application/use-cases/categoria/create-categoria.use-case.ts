import { Injectable } from '@nestjs/common';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { CategoriaEntity } from '../../../domain/entities';
import { CreateCategoriaDto } from '../../dto/categoria-dtos/create-categoria.dto';
import { ResourceConflictError } from 'src/modules/catalog/domain/errors/catalog-domain.errors';

@Injectable()
export class CreateCategoriaUseCase {
  constructor(private readonly categoriaRepository: CategoriaRepository) {}

  async execute(dto: CreateCategoriaDto): Promise<CategoriaEntity> {
    const exits = await this.categoriaRepository.existsByName(dto.nombre);
    if (exits) {
      throw new ResourceConflictError(
        'Ya existe una categoria con este nombre',
      );
    }

    return this.categoriaRepository.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      estado: dto.estado ?? true,
    });
  }
}
