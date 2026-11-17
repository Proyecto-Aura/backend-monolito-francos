import { Injectable } from '@nestjs/common';
import { CreateProductoPresentacionDto } from '../../dto/producto_presentacion-dtos/create-producto_presentacion.dto';
import { ProductoPresentacionEntity } from '../../../domain/entities/producto_presentacion.entity';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { PresentacionRepository } from '../../../domain/repositories/presentacion.repository';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import {
  createProductoPresentacionSku,
  createProductoPresentacionSlug,
  validateWholesalePrice,
} from '../../utils/producto-presentacion.utils';
import { resolverSlugUnico } from '../../utils/slug-unico.utils';

@Injectable()
export class CreateProductoPresentacionUseCase {
  constructor(
    private readonly productoPresentacionRepository: ProductoPresentacionRepository,
    private readonly productoRepository: ProductoRepository,
    private readonly presentacionRepository: PresentacionRepository,
  ) {}

  async execute(
    dto: CreateProductoPresentacionDto,
  ): Promise<ProductoPresentacionEntity> {
    const producto = await this.productoRepository.findById(dto.producto_id);

    if (!producto) {
      throw new ResourceNotFoundError('Producto no encontrado');
    }

    if (!producto.estado) {
      throw new ResourceConflictError('El producto no está activo');
    }

    const presentacion = await this.presentacionRepository.findById(
      dto.presentacion_id,
    );

    if (!presentacion) {
      throw new ResourceNotFoundError('Presentación no encontrada');
    }

    if (!presentacion.estado) {
      throw new ResourceConflictError('La presentación no está activa');
    }

    validateWholesalePrice(
      dto.precio_unitario,
      dto.precio_mayorista,
      dto.umbral_mayorista,
    );

    const sku = createProductoPresentacionSku(producto.id, presentacion.id);
    const skuExiste =
      await this.productoPresentacionRepository.existsBySku(sku);

    if (skuExiste) {
      throw new ResourceConflictError(
        'El producto ya tiene registrada esta presentación',
      );
    }

    return this.productoPresentacionRepository.create({
      sku,
      precio_unitario: dto.precio_unitario,
      precio_mayorista: dto.precio_mayorista ?? null,
      umbral_mayorista: dto.umbral_mayorista ?? null,
      producto_id: producto.id,
      presentacion_id: presentacion.id,
      imagen_key: null,
      slug: await resolverSlugUnico(
        createProductoPresentacionSlug(producto.nombre, presentacion),
        (slug) => this.productoPresentacionRepository.existsBySlug(slug),
      ),
      // Una presentación nueva nace desactivada: se activa a mano con el botón
      // Activar (HU-A-008) y recién ahí aparece en el Portal B.
      estado: dto.estado ?? false,
    });
  }
}
