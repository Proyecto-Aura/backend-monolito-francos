import { Injectable } from '@nestjs/common';
import { UpdateProductoPresentacionDto } from '../../dto/producto_presentacion-dtos/update-producto_presentacion.dto';
import { ProductoPresentacionEntity } from '../../../domain/entities/producto_presentacion.entity';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { validateWholesalePrice } from '../../utils/producto-presentacion.utils';

@Injectable()
export class UpdateProductoPresentacionUseCase {
  constructor(
    private readonly productoPresentacionRepository: ProductoPresentacionRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdateProductoPresentacionDto,
  ): Promise<ProductoPresentacionEntity> {
    const productoPresentacion =
      await this.productoPresentacionRepository.findById(id);

    if (!productoPresentacion) {
      throw new ResourceNotFoundError('Producto presentación no encontrada');
    }

    const precioUnitario =
      dto.precio_unitario ?? productoPresentacion.precio_unitario;
    const precioMayorista =
      dto.precio_mayorista === undefined
        ? productoPresentacion.precio_mayorista
        : (dto.precio_mayorista ?? null);
    const umbralMayorista =
      dto.umbral_mayorista === undefined
        ? productoPresentacion.umbral_mayorista
        : (dto.umbral_mayorista ?? null);

    validateWholesalePrice(precioUnitario, precioMayorista, umbralMayorista);

    return this.productoPresentacionRepository.update(id, {
      precio_unitario: dto.precio_unitario,
      precio_mayorista: dto.precio_mayorista,
      umbral_mayorista: dto.umbral_mayorista,
      imagen_url: dto.imagen_url,
    });
  }
}
