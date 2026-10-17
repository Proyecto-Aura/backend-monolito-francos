import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { UsuarioInterno } from '../../../domain/repositories/types/usuario-interno-repository.types';
import { UsuarioInternoRepository } from '../../../domain/repositories/usuario-interno.repository';
import { ListUsuariosInternosQueryDto } from '../../dto/usuario-interno-dtos/list-usuarios-internos-query.dto';

@Injectable()
export class ListUsuariosInternosUseCase {
  constructor(
    private readonly usuarioInternoRepository: UsuarioInternoRepository,
  ) {}

  execute(
    dto: ListUsuariosInternosQueryDto,
  ): Promise<PaginatedResult<UsuarioInterno>> {
    return this.usuarioInternoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      rol: dto.rol,
      estado: dto.estado,
    });
  }
}
