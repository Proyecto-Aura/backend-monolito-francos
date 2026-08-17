import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { RolEntity } from '../../domain/entities/rol.entity';
import { RolRepository } from '../../domain/repositories/rol.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CreateRolParams,
  ListRolesParams,
  UpdateRolParams,
} from '../../domain/repositories/types/rol-repository.types';
import { RolMapper } from '../mappers/rol.mapper';

@Injectable()
export class PrismaRolRepository implements RolRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(params: CreateRolParams): Promise<RolEntity> {
    const rol = await this.prisma.rol.create({
      data: params
    })
    return RolMapper.toDomain(rol)
  }

  async findById(id: number): Promise<RolEntity | null> {
    const rol = await this.prisma.rol.findUnique({ where: { id } });
    return rol ? RolMapper.toDomain(rol) : null;
  }

  async findByName(nombre: string): Promise<RolEntity | null> {
    const rol = await this.prisma.rol.findUnique({
      where: {nombre}
    });
    return rol ? RolMapper.toDomain(rol) : null
  }

  //para paginacion
  async findMany(params: ListRolesParams): Promise<PaginatedResult<RolEntity>> {
    const where: Prisma.RolWhereInput = {
      ...(params.estado === undefined ? {} : { estado: params.estado }),
      ...(params.search
        ? {
          nombre: {
            contains: params.search,
            mode: 'insensitive',
          },
        }
        : {}),
    };

    const [roles, total] = await this.prisma.$transaction([
      this.prisma.rol.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.rol.count({ where }),
    ]);

    return {
      data: roles.map((rol) => RolMapper.toDomain(rol)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async existsByName(nombre: string, excludeId?: number): Promise<boolean> {
    const rol = await this.prisma.rol.findFirst({
      where: {
        nombre,
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });

    return rol !== null;
  }

  async update(id: number, params: UpdateRolParams): Promise<RolEntity> {
    const rol = await this.prisma.rol.update({
      where: { id },
      data: params,
    });

    return RolMapper.toDomain(rol);
  }

  async setStatus(id: number, estado: boolean): Promise<RolEntity> {
    const rol = await this.prisma.rol.update({
      where: { id },
      data: { estado },
    });

    return RolMapper.toDomain(rol);
  }
}
