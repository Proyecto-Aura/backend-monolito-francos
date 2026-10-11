import { Injectable } from '@nestjs/common';
import { CreateProductoWithPresentacionesDto } from '../../dto/producto-dtos/create-producto-with-presentaciones.dto';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { PresentacionRepository } from '../../../domain/repositories/presentacion.repository';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { ProductoWithPresentaciones } from '../../../domain/repositories/types/producto-repository.types';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import {
  createProductoPresentacionSlug,
  validateWholesalePrice,
} from '../../utils/producto-presentacion.utils';
import { resolverSlugUnico } from '../../utils/slug-unico.utils';

@Injectable()
export class CreateProductoUseCase {
  constructor(
    private readonly productoRepository: ProductoRepository,
    private readonly categoriaRepository: CategoriaRepository,
    private readonly presentacionRepository: PresentacionRepository,
    private readonly productoPresentacionRepository: ProductoPresentacionRepository,
  ) {}

  async execute(
    dto: CreateProductoWithPresentacionesDto,
  ): Promise<ProductoWithPresentaciones> {
    const nombre = dto.nombre.trim().replace(/\s+/g, ' ');
    const productoExiste = await this.productoRepository.existsByName(nombre);

    if (productoExiste) {
      throw new ResourceConflictError(
        'Ya existe un producto registrado con ese nombre',
      );
    }

    /* -----------------VALIDACION DE CATEGORIA---------------- */
    const categoria = await this.categoriaRepository.findById(dto.categoria_id);

    if (!categoria) {
      throw new ResourceNotFoundError('Categoría no encontrada');
    }

    if (!categoria.estado) {
      throw new ResourceConflictError('La categoría no está activa');
    }

    /* ----------------VALIDACION DE PRESENTACIONES------------ */
    const idsPresentaciones = dto.producto_presentaciones.map(
      (productoPresentacion) => productoPresentacion.presentacion_id,
    );

    if (new Set(idsPresentaciones).size !== idsPresentaciones.length) {
      throw new ResourceConflictError(
        'No se puede repetir una presentación dentro del mismo producto',
      );
    }

    const presentaciones = await Promise.all(
      idsPresentaciones.map((id) => this.presentacionRepository.findById(id)),
    );

    const presentacionesPorId = new Map(
      presentaciones.map((presentacion, index) => [
        idsPresentaciones[index],
        presentacion,
      ]),
    );

    const producto_presentaciones = await Promise.all(
      dto.producto_presentaciones.map(async (productoPresentacion) => {
        const presentacion = presentacionesPorId.get(
          productoPresentacion.presentacion_id,
        );

        if (!presentacion) {
          throw new ResourceNotFoundError(
            `Presentación ${productoPresentacion.presentacion_id} no encontrada`,
          );
        }

        if (!presentacion.estado) {
          throw new ResourceConflictError(
            `La presentación ${presentacion.cantidad} ${presentacion.unidad_medida} no está activa`,
          );
        }

        validateWholesalePrice(
          productoPresentacion.precio_unitario,
          productoPresentacion.precio_mayorista,
          productoPresentacion.umbral_mayorista,
        );

        return {
          precio_unitario: productoPresentacion.precio_unitario,
          precio_mayorista: productoPresentacion.precio_mayorista ?? null,
          umbral_mayorista: productoPresentacion.umbral_mayorista ?? null,
          presentacion_id: presentacion.id,
          imagen_key: null,
          slug: await resolverSlugUnico(
            createProductoPresentacionSlug(nombre, presentacion),
            (slug) => this.productoPresentacionRepository.existsBySlug(slug),
          ),
          estado: productoPresentacion.estado ?? true,
        };
      }),
    );

    /* -------Inserción final a la BD--------------------------- */
    return this.productoRepository.createWithPresentaciones({
      nombre,
      categoria_id: categoria.id,
      descripcion: dto.descripcion ?? null,
      estado: dto.estado ?? true,
      destacado: dto.destacado,
      producto_presentaciones: producto_presentaciones,
    });
  }
}
