import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CategoriaEntity } from '../../domain/entities';
import { CategoriaRepository } from '../../domain/repositories/categoria.repository';
import {
  CreateCategoriaParams,
  ListCategoriasParams,
  UpdateCategoriaParams,
} from '../../domain/repositories/types/categoria-repository.types';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CategoriaMapper } from '../mappers/categoria.mapper';

@Injectable()
export class PrismaCategoriaRepository implements CategoriaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateCategoriaParams): Promise<CategoriaEntity> {
    return CategoriaMapper.toDomain(
      await this.prisma.categoria.create({ data: params }),
    );
  }

  async findById(id: number): Promise<CategoriaEntity | null> {
    const categoria = await this.prisma.categoria.findUnique({ where: { id } });
    return categoria ? CategoriaMapper.toDomain(categoria) : null;
  }

  async findMany(
    params: ListCategoriasParams,
  ): Promise<PaginatedResult<CategoriaEntity>> {
    const where: Prisma.CategoriaWhereInput = {
      ...(params.estado === undefined ? {} : { estado: params.estado }),
      ...(params.search
        ? { nombre: { contains: params.search, mode: 'insensitive' } }
        : {}),
    };

    const [categorias, total] = await this.prisma.$transaction([
      this.prisma.categoria.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.categoria.count({ where }),
    ]);

    return {
      data: categorias.map((categoria) => CategoriaMapper.toDomain(categoria)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }
  async existsByName(nombre: string, excludeId?: number): Promise<boolean> {
    const categoria = await this.prisma.categoria.findFirst({
      where: {
        nombre,
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });

    return categoria !== null;
  }
  async update(
    id: number,
    params: UpdateCategoriaParams,
  ): Promise<CategoriaEntity> {
    const categoria = await this.prisma.categoria.update({
      where: { id },
      data: params,
    });

    return CategoriaMapper.toDomain(categoria);
  }
  async setStatus(id: number, estado: boolean): Promise<CategoriaEntity> {
    const categoria = await this.prisma.categoria.update({
      where: { id },
      data: { estado },
    });
    return categoria;
  }
}
