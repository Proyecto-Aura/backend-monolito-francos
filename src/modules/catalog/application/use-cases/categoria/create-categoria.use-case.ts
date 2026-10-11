import { Injectable } from '@nestjs/common';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { CategoriaEntity } from '../../../domain/entities';
import { CreateCategoriaDto } from '../../dto/categoria-dtos/create-categoria.dto';
import { ResourceConflictError } from '../../../domain/errors/catalog-domain.errors';
import { normalizarTexto } from '../../utils/texto.utils';

@Injectable()
export class CreateCategoriaUseCase {
  constructor(private readonly categoriaRepository: CategoriaRepository) {}

  async execute(dto: CreateCategoriaDto): Promise<CategoriaEntity> {
    const nombre = normalizarTexto(dto.nombre);
    const exits = await this.categoriaRepository.existsByName(nombre);
    if (exits) {
      throw new ResourceConflictError(
        'Ya existe una categoria con este nombre',
      );
    }

    return this.categoriaRepository.create({
      nombre,
      descripcion: dto.descripcion ? normalizarTexto(dto.descripcion) : null,
      estado: dto.estado ?? true,
    });
  }
}
