import { Injectable } from '@nestjs/common';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { CategoriaEntity } from '../../../domain/entities';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';

@Injectable()
export class ChangeCategoriaStatusUseCase {
  constructor(private readonly categoriaRepository: CategoriaRepository) {}

  async execute(id: number, estado: boolean): Promise<CategoriaEntity> {
    const categoria = await this.categoriaRepository.findById(id);
    if (!categoria) {
      throw new ResourceNotFoundError('Categoria no encontrada');
    }
    return this.categoriaRepository.setStatus(id, estado);
  }
}
