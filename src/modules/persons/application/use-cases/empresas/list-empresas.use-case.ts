import { Injectable } from '@nestjs/common';
import { ListEmpresasQueryDto } from '../../dto/empresa-dtos/list-empresas-query.dto';
import { EmpresaEntity } from '../../../domain/entities/empresa.entity';
import { EmpresaRepository } from '../../../domain/repositories/empresa.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';

@Injectable()
export class ListEmpresasUseCase {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  execute(dto: ListEmpresasQueryDto): Promise<PaginatedResult<EmpresaEntity>> {
    return this.empresaRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado: dto.estado,
    });
  }
}
