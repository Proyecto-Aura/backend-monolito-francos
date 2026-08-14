import { Injectable } from '@nestjs/common';
import { ListRolesQueryDto } from '../../dto/rol-dtos/list-roles-query.dto';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { RolEntity } from '../../../domain/entities/rol.entity';
import { RolRepository } from '../../../domain/repositories/rol.repository';

@Injectable()
export class ListRolesUseCase {
  constructor(private readonly rolRepository: RolRepository) {}

  execute(dto: ListRolesQueryDto): Promise<PaginatedResult<RolEntity>> {
    return this.rolRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado: dto.estado,
    });
  }
}
