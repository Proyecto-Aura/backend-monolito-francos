import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ClienteEntity } from '../../domain/entities/cliente.entity';
import { ClienteRepository } from '../../domain/repositories/cliente.repository';
import {
  ClienteConPersona,
  ListClientesParams,
  UpdateClienteConPersonaParams,
} from '../../domain/repositories/types/cliente-repository.types';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CLIENTE_CON_PERSONA_INCLUDE,
  ClienteConPersonaMapper,
} from '../mappers/cliente-con-persona.mapper';
import { ClienteMapper } from '../mappers/cliente.mapper';

// Un término de búsqueda coincide si aparece en la razón social o en los datos de la persona.
const coincideCon = (termino: string): Prisma.ClienteWhereInput => {
  const contiene = {
    contains: termino,
    mode: 'insensitive',
  } satisfies Prisma.StringFilter;
  return {
    OR: [
      { razon_social: contiene },
      { persona: { nombres: contiene } },
      { persona: { apellido_paterno: contiene } },
      { persona: { apellido_materno: contiene } },
      { persona: { numero_documento: contiene } },
    ],
  };
};

// Cada nivel de ubicación se resuelve por la cadena distrito → provincia → departamento.
const filtroUbicacion = (
  params: ListClientesParams,
): Prisma.ClienteWhereInput => {
  if (params.distrito_id !== undefined) {
    return { persona: { distrito_id: params.distrito_id } };
  }
  if (params.provincia_id !== undefined) {
    return { persona: { distrito: { provincia_id: params.provincia_id } } };
  }
  if (params.departamento_id !== undefined) {
    return {
      persona: {
        distrito: { provincia: { departamento_id: params.departamento_id } },
      },
    };
  }
  return {};
};

@Injectable()
export class PrismaClienteRepository implements ClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  updateWithPersona(
    clienteId: string,
    params: UpdateClienteConPersonaParams,
  ): Promise<ClienteConPersona> {
    return this.prisma.$transaction(async (tx) => {
      await tx.persona.update({
        where: { id: params.persona_id },
        data: params.persona,
      });
      const cliente = await tx.cliente.update({
        where: { id: clienteId },
        data: params.cliente,
        include: CLIENTE_CON_PERSONA_INCLUDE,
      });
      return ClienteConPersonaMapper.toDomain(cliente);
    });
  }

  async findById(id: string): Promise<ClienteEntity | null> {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });
    return cliente ? ClienteMapper.toDomain(cliente) : null;
  }

  async findByIdConPersona(id: string): Promise<ClienteConPersona | null> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: CLIENTE_CON_PERSONA_INCLUDE,
    });
    return cliente ? ClienteConPersonaMapper.toDomain(cliente) : null;
  }

  async findManyConPersona(
    params: ListClientesParams,
  ): Promise<PaginatedResult<ClienteConPersona>> {
    // Cada palabra debe coincidir en algún campo: "ana torres" encuentra nombre + apellido.
    const terminos = params.search?.trim().split(/\s+/).filter(Boolean) ?? [];
    const where: Prisma.ClienteWhereInput = {
      ...(params.estado === undefined ? {} : { estado: params.estado }),
      ...(params.tipo_cliente === undefined
        ? {}
        : { tipo_cliente: params.tipo_cliente }),
      ...(params.categoria_cliente === undefined
        ? {}
        : { categoria_cliente: params.categoria_cliente }),
      ...filtroUbicacion(params),
      ...(terminos.length > 0 ? { AND: terminos.map(coincideCon) } : {}),
    };
    const [clientes, total] = await this.prisma.$transaction([
      this.prisma.cliente.findMany({
        where,
        include: CLIENTE_CON_PERSONA_INCLUDE,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        // `id` desempata: sin un orden total la paginación puede repetir u omitir filas.
        orderBy: [{ created_at: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.cliente.count({ where }),
    ]);
    return {
      data: clientes.map((cliente) =>
        ClienteConPersonaMapper.toDomain(cliente),
      ),
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

  async setStatus(id: string, estado: boolean): Promise<ClienteConPersona> {
    return ClienteConPersonaMapper.toDomain(
      await this.prisma.cliente.update({
        where: { id },
        data: { estado },
        include: CLIENTE_CON_PERSONA_INCLUDE,
      }),
    );
  }
}
