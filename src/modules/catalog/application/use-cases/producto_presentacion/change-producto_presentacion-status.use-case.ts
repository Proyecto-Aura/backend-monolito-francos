import { Injectable } from '@nestjs/common';
import { ProductoPresentacionEntity } from '../../../domain/entities/producto_presentacion.entity';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';

@Injectable()
export class ChangeProductoPresentacionStatusUseCase {
  constructor(
    private readonly productoPresentacionRepository: ProductoPresentacionRepository,
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

    return this.productoPresentacionRepository.setStatus(id, estado);
  }
}
