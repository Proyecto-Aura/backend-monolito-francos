import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ClienteEntity } from '../../domain/entities/cliente.entity';
import { ClienteRepository } from '../../domain/repositories/cliente.repository';
import {
  CreateClienteParams,
  ListClientesParams,
  UpdateClienteParams,
} from '../../domain/repositories/types/cliente-repository.types';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import { ClienteMapper } from '../mappers/cliente.mapper';

@Injectable()
export class PrismaClienteRepository implements ClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateClienteParams): Promise<ClienteEntity> {
    return ClienteMapper.toDomain(
      await this.prisma.cliente.create({ data: params }),
    );
  }

  async findById(id: string): Promise<ClienteEntity | null> {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });
    return cliente ? ClienteMapper.toDomain(cliente) : null;
  }

  async findMany(
    params: ListClientesParams,
  ): Promise<PaginatedResult<ClienteEntity>> {
    const where: Prisma.ClienteWhereInput = {
      ...(params.estado === undefined ? {} : { estado: params.estado }),
      ...(params.tipo_cliente === undefined
        ? {}
        : { tipo_cliente: params.tipo_cliente }),
      ...(params.categoria_cliente === undefined
        ? {}
        : { categoria_cliente: params.categoria_cliente }),
      ...(params.search
        ? { razon_social: { contains: params.search, mode: 'insensitive' } }
        : {}),
    };
    const [clientes, total] = await this.prisma.$transaction([
      this.prisma.cliente.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.cliente.count({ where }),
    ]);
    return {
      data: clientes.map((cliente) => ClienteMapper.toDomain(cliente)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async existsByPersonaId(
    personaId: string,
    excludeId?: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.cliente.findFirst({
        where: {
          persona_id: personaId,
          ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
        },
        select: { id: true },
      })) !== null
    );
  }
  
  async update(
    id: string,
    params: UpdateClienteParams,
  ): Promise<ClienteEntity> {
    return ClienteMapper.toDomain(
      await this.prisma.cliente.update({ where: { id }, data: params }),
    );
  }
  async setStatus(id: string, estado: boolean): Promise<ClienteEntity> {
    return ClienteMapper.toDomain(
      await this.prisma.cliente.update({ where: { id }, data: { estado } }),
    );
  }
}
