import { Injectable } from '@nestjs/common';
import { ListRutasQueryDto } from '../../dto/ruta-dtos/list-rutas-query.dto';
import { RutaEntity } from '../../../domain/entities/ruta.entity';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';

@Injectable()
export class ListRutasUseCase {
  constructor(private readonly rutaRepository: RutaRepository) {}

  execute(dto: ListRutasQueryDto): Promise<PaginatedResult<RutaEntity>> {
    return this.rutaRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado: dto.estado,
      parent_id: dto.parent_id,
    });
  }
}
