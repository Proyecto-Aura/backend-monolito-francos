import { Injectable } from '@nestjs/common';
import { ProductoPresentacionEntity } from '../../../domain/entities/producto_presentacion.entity';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { ProductoTerminadoRepository } from '../../../domain/repositories/producto-terminado.repository';

@Injectable()
export class ChangeProductoPresentacionStatusUseCase {
  constructor(
    private readonly productoPresentacionRepository: ProductoPresentacionRepository,
    private readonly productoTerminadoRepository: ProductoTerminadoRepository,
  ) {}

  async execute(
    id: number,
    estado: boolean,
  ): Promise<ProductoPresentacionEntity> {
    const productoPresentacion =
      await this.productoPresentacionRepository.findById(id);

    if (!productoPresentacion) {
      throw new ResourceNotFoundError('Producto presentación no encontrada');
    }

    // Solo se puede desactivar una presentación cuando su stock es cero. Todavía
    // no hay lotes con fecha de vencimiento, así que cualquier stock mayor a cero
    // lo impide (aunque estuviera por caducar).
    if (
      !estado &&
      (await this.productoTerminadoRepository.existsConStockByProductoPresentacion(
        id,
      ))
    ) {
      throw new ResourceConflictError(
        'No se puede desactivar la presentación: todavía tiene stock disponible',
      );
    }

    return this.productoPresentacionRepository.setStatus(id, estado);
  }
}
