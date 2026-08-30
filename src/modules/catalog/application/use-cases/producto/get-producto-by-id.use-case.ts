import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';
import { ProductoCatalogo } from '../../../domain/repositories/types/producto-repository.types';

@Injectable()
export class GetProductoByIdUseCase {
  constructor(private readonly productoRepository: ProductoRepository) {}

  async execute(id: number): Promise<ProductoCatalogo> {
    const producto = await this.productoRepository.findById(id);

    if (!producto) {
      throw new ResourceNotFoundError('Producto no encontrado');
    }

    return producto;
  }
}
