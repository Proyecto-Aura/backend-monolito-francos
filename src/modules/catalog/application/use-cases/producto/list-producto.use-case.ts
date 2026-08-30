import { Injectable } from '@nestjs/common';
import { ListProductoQueryDto } from '../../dto/producto-dtos/list-producto-query.dto';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { ProductoCatalogo } from '../../../domain/repositories/types/producto-repository.types';

@Injectable()
export class ListProductosUseCase {
  constructor(private readonly productoRepository: ProductoRepository) {}

  execute(
    dto: ListProductoQueryDto,
  ): Promise<PaginatedResult<ProductoCatalogo>> {
    return this.productoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado: dto.estado,
      categoria_id: dto.categoria_id,
      destacado: dto.destacado,
    });
  }
}
