import { Injectable } from '@nestjs/common';
import { UpdateProductoWithPresentacionesDto } from '../../dto/producto-dtos/update-producto-with-presentaciones.dto';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { PresentacionRepository } from '../../../domain/repositories/presentacion.repository';
import {
  ProductoCatalogo,
  UpdateProductoPresentacionAnidadaParams,
} from '../../../domain/repositories/types/producto-repository.types';
import { TipoPromocion } from '../../../domain/enums';
import {
  createProductoPresentacionSlug,
  validatePromocion,
  validateWholesalePrice,
} from '../../utils/producto-presentacion.utils';

@Injectable()
export class UpdateProductoUseCase {
  constructor(
    private readonly productoRepository: ProductoRepository,
    private readonly categoriaRepository: CategoriaRepository,
    private readonly productoPresentacionRepository: ProductoPresentacionRepository,
    private readonly presentacionRepository: PresentacionRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdateProductoWithPresentacionesDto,
  ): Promise<ProductoCatalogo> {
    const producto = await this.productoRepository.findById(id);

    if (!producto) {
      throw new ResourceNotFoundError('Producto no encontrado');
    }

    const nombre =
      dto.nombre === undefined
        ? undefined
        : dto.nombre.trim().replace(/\s+/g, ' ');

    if (
      nombre !== undefined &&
      nombre.toLowerCase() !== producto.nombre.toLowerCase()
    ) {
      const productoExiste = await this.productoRepository.existsByName(
        nombre,
        id,
      );

      if (productoExiste) {
        throw new ResourceConflictError(
          'Ya existe otro producto registrado con ese nombre',
        );
      }
    }

    if (
      dto.categoria_id !== undefined &&
      dto.categoria_id !== producto.categoria_id
    ) {
      const categoria = await this.categoriaRepository.findById(
        dto.categoria_id,
      );

      if (!categoria) {
        throw new ResourceNotFoundError('Categoría no encontrada');
      }

      if (!categoria.estado) {
        throw new ResourceConflictError('La categoría no está activa');
      }
    }

    const idsProductoPresentaciones = (dto.producto_presentaciones ?? []).map(
      (productoPresentacion) => productoPresentacion.id,
    );

    if (
      new Set(idsProductoPresentaciones).size !==
      idsProductoPresentaciones.length
    ) {
      throw new ResourceConflictError(
        'No se puede repetir una producto presentación en la misma edición',
      );
    }

    const idsPromociones = (dto.producto_presentaciones ?? []).flatMap(
      (productoPresentacion) =>
        (productoPresentacion.promociones ?? [])
          .map((promocion) => promocion.id)
          .filter((promocionId): promocionId is number =>
            Number.isInteger(promocionId),
          ),
    );

    if (new Set(idsPromociones).size !== idsPromociones.length) {
      throw new ResourceConflictError(
        'No se puede repetir una promoción en la misma edición',
      );
    }

    let productoPresentaciones: UpdateProductoPresentacionAnidadaParams[] = (
      dto.producto_presentaciones ?? []
    ).map((productoPresentacionDto) => {
      const productoPresentacion = producto.producto_presentaciones.find(
        (item) => item.id === productoPresentacionDto.id,
      );

      if (!productoPresentacion) {
        throw new ResourceNotFoundError(
          `Producto presentación ${productoPresentacionDto.id} no encontrada en el producto`,
        );
      }

      const precioUnitario =
        productoPresentacionDto.precio_unitario ??
        productoPresentacion.precio_unitario;
      const precioMayorista =
        productoPresentacionDto.precio_mayorista === undefined
          ? productoPresentacion.precio_mayorista
          : (productoPresentacionDto.precio_mayorista ?? null);
      const umbralMayorista =
        productoPresentacionDto.umbral_mayorista === undefined
          ? productoPresentacion.umbral_mayorista
          : (productoPresentacionDto.umbral_mayorista ?? null);

      validateWholesalePrice(precioUnitario, precioMayorista, umbralMayorista);

      const promociones = productoPresentacionDto.promociones?.map(
        (promocionDto) => {
          const promocionExistente = promocionDto.id
            ? productoPresentacion.promociones.find(
                (promocion) => promocion.id === promocionDto.id,
              )
            : undefined;

          if (promocionDto.id && !promocionExistente) {
            throw new ResourceNotFoundError(
              `Promoción ${promocionDto.id} no encontrada en la producto presentación ${productoPresentacion.id}`,
            );
          }

          validatePromocion(promocionDto);

          return {
            id: promocionDto.id,
            nombre: promocionDto.nombre.trim().replace(/\s+/g, ' '),
            tipo: promocionDto.tipo as TipoPromocion,
            valor: promocionDto.valor,
            cantidad_paga: promocionDto.cantidad_paga ?? null,
            cantidad_lleva: promocionDto.cantidad_lleva ?? null,
            cantidad_minima: promocionDto.cantidad_minima ?? null,
            producto_presentacion_regalo_id:
              promocionDto.producto_presentacion_regalo_id ?? null,
            fecha_inicio: promocionDto.fecha_inicio,
            fecha_fin: promocionDto.fecha_fin,
            estado: promocionDto.estado ?? promocionExistente?.estado ?? true,
          };
        },
      );

      return {
        id: productoPresentacionDto.id,
        precio_unitario: productoPresentacionDto.precio_unitario,
        precio_mayorista: productoPresentacionDto.precio_mayorista,
        umbral_mayorista: productoPresentacionDto.umbral_mayorista,
        imagen_url: productoPresentacionDto.imagen_url,
        promociones,
      };
    });

    if (nombre !== undefined && nombre !== producto.nombre) {
      const presentaciones = await Promise.all(
        producto.producto_presentaciones.map((productoPresentacion) =>
          this.presentacionRepository.findById(
            productoPresentacion.presentacion_id,
          ),
        ),
      );
      const actualizacionesPorId = new Map(
        productoPresentaciones.map((productoPresentacion) => [
          productoPresentacion.id,
          productoPresentacion,
        ]),
      );

      productoPresentaciones = producto.producto_presentaciones.map(
        (productoPresentacion, index) => {
          const presentacion = presentaciones[index];

          if (!presentacion) {
            throw new ResourceNotFoundError(
              `Presentación ${productoPresentacion.presentacion_id} no encontrada`,
            );
          }

          return {
            ...(actualizacionesPorId.get(productoPresentacion.id) ?? {
              id: productoPresentacion.id,
            }),
            slug: createProductoPresentacionSlug(nombre, presentacion),
          };
        },
      );
    }

    const idsRegalo = [
      ...new Set(
        productoPresentaciones.flatMap((productoPresentacion) =>
          (productoPresentacion.promociones ?? [])
            .map((promocion) => promocion.producto_presentacion_regalo_id)
            .filter((regaloId): regaloId is number => regaloId !== null),
        ),
      ),
    ];

    const presentacionesRegalo = await Promise.all(
      idsRegalo.map((regaloId) =>
        this.productoPresentacionRepository.findById(regaloId),
      ),
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

    return this.productoRepository.updateWithPresentaciones(id, {
      nombre,
      categoria_id: dto.categoria_id,
      descripcion: dto.descripcion,
      destacado: dto.destacado,
      producto_presentaciones: productoPresentaciones,
    });
  }
}
