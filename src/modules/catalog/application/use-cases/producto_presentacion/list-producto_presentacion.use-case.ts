import { Injectable } from '@nestjs/common';
import { ListProductoPresentacionQueryDto } from '../../dto/producto_presentacion-dtos/list-producto_presentacion-query.dto';
import { ProductoPresentacionEntity } from '../../../domain/entities/producto_presentacion.entity';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';

@Injectable()
export class ListProductoPresentacionesUseCase {
  constructor(
    private readonly productoPresentacionRepository: ProductoPresentacionRepository,
  ) {}

  execute(
    dto: ListProductoPresentacionQueryDto,
  ): Promise<PaginatedResult<ProductoPresentacionEntity>> {
    return this.productoPresentacionRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado: dto.estado,
    });
  }
}
