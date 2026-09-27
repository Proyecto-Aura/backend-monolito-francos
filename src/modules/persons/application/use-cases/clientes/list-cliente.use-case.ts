import { Injectable } from '@nestjs/common';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository';
import { ClienteEntity } from '../../../domain/entities/cliente.entity';
import { ListClientesQueryDto } from '../../dto/cliente-dtos/list-clientes-query.dto';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import {
  CategoriaCliente,
  TipoCliente,
} from '../../../domain/enums/persons.enums';

@Injectable()
export class ListClientesUseCase {
  constructor(private readonly clienteRepository: ClienteRepository) {}
  execute(dto: ListClientesQueryDto): Promise<PaginatedResult<ClienteEntity>> {
    return this.clienteRepository.findMany({
      ...dto,
      tipo_cliente: dto.tipo_cliente as TipoCliente | undefined,
      categoria_cliente: dto.categoria_cliente as CategoriaCliente | undefined,
    });
  }
}
