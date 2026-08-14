import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PersonaEntity } from '../../domain/entities/persona.entity';
import { PersonaRepository } from '../../domain/repositories/persona.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CreatePersonaParams,
  ListPersonasParams,
  UpdatePersonaParams,
} from '../../domain/repositories/types/persona-repository.types';
import { PersonaMapper } from '../mappers/persona.mapper';

@Injectable()
export class PrismaPersonaRepository implements PersonaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreatePersonaParams): Promise<PersonaEntity> {
    const persona = await this.prisma.persona.create({
      data: {
        ...params,
        tipo_documento: params.tipo_documento,
      },
    });

    return PersonaMapper.toDomain(persona);
  }

  async findById(id: string): Promise<PersonaEntity | null> {
    const persona = await this.prisma.persona.findUnique({ where: { id } });
    return persona ? PersonaMapper.toDomain(persona) : null;
  }

  async findMany(
    params: ListPersonasParams,
  ): Promise<PaginatedResult<PersonaEntity>> {
    const where: Prisma.PersonaWhereInput = {
      ...(params.estado === undefined ? {} : { estado: params.estado }),
      ...(params.tipo_documento === undefined
        ? {}
        : { tipo_documento: params.tipo_documento }),
      ...(params.search
        ? {
            OR: [
              { nombres: { contains: params.search, mode: 'insensitive' } },
              {
                apellido_paterno: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
              {
                apellido_materno: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
              {
                numero_documento: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [personas, total] = await this.prisma.$transaction([
      this.prisma.persona.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: [{ apellido_paterno: 'asc' }, { nombres: 'asc' }],
      }),
      this.prisma.persona.count({ where }),
    ]);

    return {
      data: personas.map((persona) => PersonaMapper.toDomain(persona)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async existsByDocument(
    numeroDocumento: string,
    excludeId?: string,
  ): Promise<boolean> {
    const persona = await this.prisma.persona.findFirst({
      where: {
        numero_documento: numeroDocumento,
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });

    return persona !== null;
  }

  async update(
    id: string,
    params: UpdatePersonaParams,
  ): Promise<PersonaEntity> {
    const persona = await this.prisma.persona.update({
      where: { id },
      data: {
        ...params,
        tipo_documento: params.tipo_documento,
      },
    });

    return PersonaMapper.toDomain(persona);
  }

  async setStatus(id: string, estado: boolean): Promise<PersonaEntity> {
    const persona = await this.prisma.persona.update({
      where: { id },
      data: { estado },
    });

    return PersonaMapper.toDomain(persona);
  }
}
