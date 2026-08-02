import { Injectable } from '@nestjs/common';
import { ProductoEntity } from '../../../domain/entities/producto.entity';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';

@Injectable()
export class GetProductoByIdUseCase {
  constructor(private readonly productoRepository: ProductoRepository) {}

  async execute(id: number): Promise<ProductoEntity> {
    const producto = await this.productoRepository.findById(id);

    if (!producto) {
      throw new ResourceNotFoundError('Producto no encontrado');
    }

    return producto;
  }
}
