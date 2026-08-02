import { Injectable } from '@nestjs/common';
import { ListPresentacionQueryDto } from '../../dto/presentacion-dtos/list-presentacion-query.dto';
import { PresentacionEntity } from '../../../domain/entities/presentacion.entity';
import { PresentacionRepository } from '../../../domain/repositories/presentacion.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';

@Injectable()
export class ListPresentacionUseCase {
  constructor(
    private readonly presentacionRepository: PresentacionRepository,
  ) {}

  execute(
    dto: ListPresentacionQueryDto,
  ): Promise<PaginatedResult<PresentacionEntity>> {
    return this.presentacionRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado: dto.estado,
      unidad_medida: dto.unidad_medida,
      cantidad: dto.cantidad,
    });
  }
}
