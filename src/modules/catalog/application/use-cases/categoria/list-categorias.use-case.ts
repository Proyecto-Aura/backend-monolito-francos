import { Injectable } from '@nestjs/common';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { ListCategoriasQueryDto } from '../../dto/categoria-dtos/list-categorias-query.dto';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { CategoriaEntity } from '../../../domain/entities';

@Injectable()
export class ListCategoriasUseCase {
  constructor(private readonly categoriaRepository: CategoriaRepository) {}
  async execute(
    dto: ListCategoriasQueryDto,
  ): Promise<PaginatedResult<CategoriaEntity>> {
    return this.categoriaRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado: dto.estado,
    });
  }
}
