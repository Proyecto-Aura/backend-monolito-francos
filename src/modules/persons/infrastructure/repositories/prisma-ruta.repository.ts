import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { RutaEntity } from '../../domain/entities/ruta.entity';
import { RutaRepository } from '../../domain/repositories/ruta.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CreateRutaParams,
  ListRutasParams,
  MoveRutaParams,
  UpdateRutaParams,
} from '../../domain/repositories/types/ruta-repository.types';
import { RutaMapper } from '../mappers/ruta.mapper';

@Injectable()
export class PrismaRutaRepository implements RutaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateRutaParams): Promise<RutaEntity> {
    const ruta = await this.prisma.ruta.create({ data: params });
    return RutaMapper.toDomain(ruta);
  }

  async findById(id: number): Promise<RutaEntity | null> {
    const ruta = await this.prisma.ruta.findUnique({ where: { id } });
    return ruta ? RutaMapper.toDomain(ruta) : null;
  }

  async findMany(
    params: ListRutasParams,
  ): Promise<PaginatedResult<RutaEntity>> {
    const where: Prisma.RutaWhereInput = {
      ...(params.estado === undefined ? {} : { estado: params.estado }),
      ...(params.parent_id === undefined
        ? {}
        : { parent_id: params.parent_id }),
      ...(params.search
        ? {
            nombre: {
              contains: params.search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [rutas, total] = await this.prisma.$transaction([
      this.prisma.ruta.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.ruta.count({ where }),
    ]);

    return {
      data: rutas.map((ruta) => RutaMapper.toDomain(ruta)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async findAllByStatus(estado: boolean): Promise<RutaEntity[]> {
    const rutas = await this.prisma.ruta.findMany({
      where: { estado },
      orderBy: { nombre: 'asc' },
    });

    return rutas.map((ruta) => RutaMapper.toDomain(ruta));
  }

  async existsByName(nombre: string, excludeId?: number): Promise<boolean> {
    const ruta = await this.prisma.ruta.findFirst({
      where: {
        nombre,
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });

    return ruta !== null;
  }

  async update(id: number, params: UpdateRutaParams): Promise<RutaEntity> {
    const ruta = await this.prisma.ruta.update({
      where: { id },
      data: params,
    });

    return RutaMapper.toDomain(ruta);
  }

  async move(id: number, params: MoveRutaParams): Promise<RutaEntity> {
    const ruta = await this.prisma.ruta.update({
      where: { id },
      data: params,
    });

    return RutaMapper.toDomain(ruta);
  }

  async hasActiveChildren(id: number): Promise<boolean> {
    const child = await this.prisma.ruta.findFirst({
      where: { parent_id: id, estado: true },
      select: { id: true },
    });

    return child !== null;
  }

  async setStatus(id: number, estado: boolean): Promise<RutaEntity> {
    const ruta = await this.prisma.ruta.update({
      where: { id },
      data: { estado },
    });

    return RutaMapper.toDomain(ruta);
  }
}
