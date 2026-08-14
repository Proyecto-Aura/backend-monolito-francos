import { Injectable } from '@nestjs/common';
import { UpdateProductoDto } from '../../dto/producto-dtos/update-producto.dto';
import { ProductoEntity } from '../../../domain/entities/producto.entity';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';

@Injectable()
export class UpdateProductoUseCase {
  constructor(
    private readonly productoRepository: ProductoRepository,
    private readonly categoriaRepository: CategoriaRepository,
  ) {}

  async execute(id: number, dto: UpdateProductoDto): Promise<ProductoEntity> {
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

    return this.productoRepository.update(id, {
      nombre,
      categoria_id: dto.categoria_id,
      descripcion: dto.descripcion,
      destacado: dto.destacado,
    });
  }
}
