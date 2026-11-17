import { Injectable } from '@nestjs/common';
import { ProductoEntity } from '../../../domain/entities/producto.entity';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';
import { ProductoTerminadoRepository } from '../../../domain/repositories/producto-terminado.repository';

@Injectable()
export class ChangeProductoStatusUseCase {
  constructor(
    private readonly productoRepository: ProductoRepository,
    private readonly productoTerminadoRepository: ProductoTerminadoRepository,
  ) {}

  async execute(id: number, estado: boolean): Promise<ProductoEntity> {
    const producto = await this.productoRepository.findById(id);

    if (!producto) {
      throw new ResourceNotFoundError('Producto no encontrado');
    }

    // Solo se puede desactivar un producto cuando el stock de su producto
    // terminado es cero. Todavía no hay lotes con fecha de vencimiento, así que
    // cualquier stock mayor a cero lo impide (aunque estuviera por caducar).
    if (
      !estado &&
      (await this.productoTerminadoRepository.existsConStockByProducto(id))
    ) {
      throw new ResourceConflictError(
        'No se puede desactivar el producto: todavía tiene stock disponible',
      );
    }

    return this.productoRepository.setStatus(id, estado);
  }
}
