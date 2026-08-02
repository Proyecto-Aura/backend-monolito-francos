import { Injectable } from '@nestjs/common';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';

@Injectable()
export class GetCategoriaByIdUseCase {
  constructor(private readonly categoriaRepository: CategoriaRepository) {}

  async execute(id: number) {
    const categoria = await this.categoriaRepository.findById(id);
    if (!categoria) {
      throw new ResourceNotFoundError('Categoria no encontrada');
    }
    return categoria;
  }
}
