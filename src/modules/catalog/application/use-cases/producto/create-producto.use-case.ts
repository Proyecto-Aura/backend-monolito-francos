import { Injectable } from '@nestjs/common';
import { CreateProductoWithPresentacionesDto } from '../../dto/producto-dtos/create-producto-with-presentaciones.dto';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { PresentacionRepository } from '../../../domain/repositories/presentacion.repository';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { ProductoCatalogo } from '../../../domain/repositories/types/producto-repository.types';
import { TipoPromocion } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import {
  createProductoPresentacionSlug,
  validatePromocion,
  validateWholesalePrice,
} from '../../utils/producto-presentacion.utils';

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
  ): Promise<ProductoCatalogo> {
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

    const producto_presentaciones = dto.producto_presentaciones.map(
      (productoPresentacion) => {
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

        for (const promocion of productoPresentacion.promociones ?? []) {
          validatePromocion(promocion);
        }

        return {
          precio_unitario: productoPresentacion.precio_unitario,
          precio_mayorista: productoPresentacion.precio_mayorista ?? null,
          umbral_mayorista: productoPresentacion.umbral_mayorista ?? null,
          presentacion_id: presentacion.id,
          imagen_url: productoPresentacion.imagen_url ?? null,
          slug: createProductoPresentacionSlug(nombre, presentacion),
          estado: productoPresentacion.estado ?? true,
          promociones: (productoPresentacion.promociones ?? []).map(
            (promocion) => ({
              nombre: promocion.nombre.trim().replace(/\s+/g, ' '),
              tipo: promocion.tipo as TipoPromocion,
              valor: promocion.valor,
              cantidad_paga: promocion.cantidad_paga ?? null,
              cantidad_lleva: promocion.cantidad_lleva ?? null,
              cantidad_minima: promocion.cantidad_minima ?? null,
              producto_presentacion_regalo_id:
                promocion.producto_presentacion_regalo_id ?? null,
              fecha_inicio: promocion.fecha_inicio,
              fecha_fin: promocion.fecha_fin,
              estado: promocion.estado ?? true,
            }),
          ),
        };
      },
    );

    const idsRegalo = [
      ...new Set(
        producto_presentaciones.flatMap((productoPresentacion) =>
          productoPresentacion.promociones
            .map((promocion) => promocion.producto_presentacion_regalo_id)
            .filter((id): id is number => id !== null),
        ),
      ),
    ];

    const presentacionesRegalo = await Promise.all(
      idsRegalo.map((id) => this.productoPresentacionRepository.findById(id)),
    );

    presentacionesRegalo.forEach((presentacionRegalo, index) => {
      if (!presentacionRegalo) {
        throw new ResourceNotFoundError(
          `Producto presentación de regalo ${idsRegalo[index]} no encontrada`,
        );
      }

      if (!presentacionRegalo.estado) {
        throw new ResourceConflictError(
          `La producto presentación de regalo ${idsRegalo[index]} no está activa`,
        );
      }
    });

    /* -------Inserción final a la BD--------------------------- */
    return this.productoRepository.createWithPresentaciones({
      nombre,
      categoria_id: categoria.id,
      descripcion: dto.descripcion ?? null,
      estado: dto.estado ?? true,
      destacado: dto.destacado,
      producto_presentaciones,
    });
  }
}
