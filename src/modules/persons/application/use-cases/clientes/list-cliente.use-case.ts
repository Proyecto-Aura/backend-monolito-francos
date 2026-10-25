import { Injectable } from '@nestjs/common';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository';
import { ListClientesQueryDto } from '../../dto/cliente-dtos/list-clientes-query.dto';
import { ClienteConPersona } from '../../../domain/repositories/types/cliente-repository.types';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import {
  CategoriaCliente,
  TipoCliente,
} from '../../../domain/enums/persons.enums';

@Injectable()
export class ListClientesUseCase {
  constructor(private readonly clienteRepository: ClienteRepository) {}
  execute(
    dto: ListClientesQueryDto,
  ): Promise<PaginatedResult<ClienteConPersona>> {
    return this.clienteRepository.findManyConPersona({
      ...dto,
      tipo_cliente: dto.tipo_cliente as TipoCliente | undefined,
      categoria_cliente: dto.categoria_cliente as CategoriaCliente | undefined,
    });
  }
}
