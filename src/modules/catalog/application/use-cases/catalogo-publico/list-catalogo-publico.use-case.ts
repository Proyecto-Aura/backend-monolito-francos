import { Injectable } from '@nestjs/common';
import { CatalogoPublicoRepository } from '../../../domain/repositories/catalogo-publico.repository';
import { CatalogoPublicoItem } from '../../../domain/repositories/types/catalogo-publico-repository.types';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { ListCatalogoPublicoQueryDto } from '../../dto/catalogo-publico-dtos/list-catalogo-publico-query.dto';
import { fechaHoy, parseFechaDia } from '../../utils/promocion.utils';

@Injectable()
export class ListCatalogoPublicoUseCase {
  constructor(
    private readonly catalogoPublicoRepository: CatalogoPublicoRepository,
  ) {}

  execute(
    dto: ListCatalogoPublicoQueryDto,
  ): Promise<PaginatedResult<CatalogoPublicoItem>> {
    return this.catalogoPublicoRepository.findItems({
      page: dto.page,
      limit: dto.limit,
      q: dto.q,
      categoria_id: dto.categoria_id,
      orden: dto.orden,
      // "Hoy" para las promociones es el día de Lima, no el de UTC.
      fecha_referencia: parseFechaDia(fechaHoy()),
    });
  }
}
