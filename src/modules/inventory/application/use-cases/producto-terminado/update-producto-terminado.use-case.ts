import { Injectable } from '@nestjs/common';
import { ProductoTerminadoEntity } from '../../../domain/entities';
import { ResourceNotFoundError } from '../../../../catalog/domain/errors/catalog-domain.errors';
import { ProductoTerminadoRepository } from '../../../domain/repositories/producto-terminado.repository';
import { validateStockRange } from '../../utils/insumo.utils';
import { UpdateProductoTerminadoDto } from '../../dto/producto-terminado-dtos/update-producto-terminado.dto';

@Injectable()
export class UpdateProductoTerminadoUseCase {
  constructor(
    private readonly productoTerminadoRepository: ProductoTerminadoRepository,
  ) {}

  async execute(
    productoPresentacionId: number,
    dto: UpdateProductoTerminadoDto,
  ): Promise<ProductoTerminadoEntity> {
    const existe =
      await this.productoTerminadoRepository.existeProductoPresentacion(
        productoPresentacionId,
      );
    if (!existe) {
      throw new ResourceNotFoundError('Producto-presentación no encontrada');
    }

    const actual =
      await this.productoTerminadoRepository.findByProductoPresentacionId(
        productoPresentacionId,
      );
    const stockMinimo = dto.stock_minimo ?? actual?.stock_minimo ?? 1;
    const stockMaximo =
      dto.stock_maximo === undefined
        ? (actual?.stock_maximo ?? null)
        : dto.stock_maximo;
    validateStockRange(stockMinimo, stockMaximo);

    return this.productoTerminadoRepository.updateByProductoPresentacionId(
      productoPresentacionId,
      {
        stock_minimo: dto.stock_minimo,
        stock_maximo: dto.stock_maximo,
      },
    );
  }
}
