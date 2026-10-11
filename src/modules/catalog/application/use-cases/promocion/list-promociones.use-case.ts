import { Injectable } from '@nestjs/common';
import { PromocionEntity } from '../../../domain/entities';
import { PromocionRepository } from '../../../domain/repositories/promocion.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { ListPromocionQueryDto } from '../../dto/promocion-dtos/list-promocion-query.dto';

@Injectable()
export class ListPromocionesUseCase {
  constructor(private readonly promocionRepository: PromocionRepository) {}

  execute(
    dto: ListPromocionQueryDto,
  ): Promise<PaginatedResult<PromocionEntity>> {
    return this.promocionRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado: dto.estado,
      producto_presentacion_id: dto.producto_presentacion_id,
    });
  }
}
