import { Injectable } from '@nestjs/common';
import { ListProductoPresentacionQueryDto } from '../../dto/producto_presentacion-dtos/list-producto_presentacion-query.dto';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { ProductoPresentacionCatalogo } from '../../../domain/repositories/types/producto_presentacion-repository.types';
import { fechaHoy, parseFechaDia } from '../../utils/promocion.utils';

@Injectable()
export class ListProductoPresentacionesUseCase {
  constructor(
    private readonly productoPresentacionRepository: ProductoPresentacionRepository,
  ) {}

  execute(
    dto: ListProductoPresentacionQueryDto,
  ): Promise<PaginatedResult<ProductoPresentacionCatalogo>> {
    return this.productoPresentacionRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado: dto.estado,
      categoria_id: dto.categoria_id,
      presentacion_id: dto.presentacion_id,
      con_stock: dto.con_stock,
      nivel: dto.nivel,
      // "Hoy" para las promociones es el día de Lima, no el de UTC.
      fecha_referencia: parseFechaDia(fechaHoy()),
    });
  }
}
