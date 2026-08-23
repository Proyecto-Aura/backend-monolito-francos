import { Injectable } from '@nestjs/common';
import { ListClientesQueryDto } from '../../dto/cliente-dtos/list-clientes-query.dto';
import { UpdateClienteDto } from '../../dto/cliente-dtos/update-cliente.dto';
import { ClienteEntity } from '../../../domain/entities/cliente.entity';
import {
  CategoriaCliente,
  TipoCliente,
} from '../../../domain/enums/persons.enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';

const assertCompany = (
  tipo: TipoCliente,
  razonSocial?: string | null,
): void => {
  if (tipo === TipoCliente.EMPRESA && !razonSocial)
    throw new ResourceConflictError(
      'La razón social es obligatoria para un cliente empresa',
    );
};
@Injectable()
export class GetClienteByIdUseCase {
  constructor(private readonly clienteRepository: ClienteRepository) {}
  async execute(id: string): Promise<ClienteEntity> {
    const value = await this.clienteRepository.findById(id);
    if (!value) throw new ResourceNotFoundError('Cliente no encontrado');
    return value;
  }
}
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
@Injectable()
export class UpdateClienteUseCase {
  constructor(private readonly clienteRepository: ClienteRepository) {}
  async execute(id: string, dto: UpdateClienteDto): Promise<ClienteEntity> {
    const current = await this.clienteRepository.findById(id);
    if (!current) throw new ResourceNotFoundError('Cliente no encontrado');
    const tipo =
      (dto.tipo_cliente as TipoCliente | undefined) ?? current.tipo_cliente;
    if (tipo) {
      assertCompany(tipo, dto.razon_social ?? current.razon_social);
    }
    return this.clienteRepository.update(id, {
      tipo_cliente: dto.tipo_cliente as TipoCliente | undefined,
      razon_social: dto.razon_social,
      categoria_cliente: dto.categoria_cliente as CategoriaCliente | undefined,
    });
  }
}
@Injectable()
export class ChangeClienteStatusUseCase {
  constructor(private readonly clienteRepository: ClienteRepository) {}
  async execute(id: string, estado: boolean): Promise<ClienteEntity> {
    const value = await this.clienteRepository.findById(id);
    if (!value) throw new ResourceNotFoundError('Cliente no encontrado');
    return this.clienteRepository.setStatus(id, estado);
  }
}
