import { Injectable } from '@nestjs/common';
import { Prisma, UnidadMedidaPresentacion } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PresentacionRepository } from '../../domain/repositories/presentacion.repository';
import { PresentacionEntity } from '../../domain/entities';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CreatePresentacionParams,
  ListPresentacionesParams,
  UpdatePresentacionParams,
} from '../../domain/repositories/types/presentacion-repository.types';
import { PresentacionMapper } from '../mappers/presentacion.mapper';

@Injectable()
export class PrismaPresentacionRepository implements PresentacionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreatePresentacionParams): Promise<PresentacionEntity> {
    return PresentacionMapper.toDomain(
      await this.prisma.presentacion.create({
        data: params,
      }),
    );
  }

  async findById(id: number): Promise<PresentacionEntity | null> {
    const presentacion = await this.prisma.presentacion.findUnique({
      where: { id },
    });
    return presentacion ? PresentacionMapper.toDomain(presentacion) : null;
  }

  async findMany(
    params: ListPresentacionesParams,
  ): Promise<PaginatedResult<PresentacionEntity>> {
    const where: Prisma.PresentacionWhereInput = {
      ...(params.estado === undefined ? {} : { estado: params.estado }),
      ...(params.unidad_medida ? { unidad_medida: params.unidad_medida } : {}),
      ...(params.cantidad === undefined ? {} : { cantidad: params.cantidad }),
      ...(params.search
        ? { descripcion: { contains: params.search, mode: 'insensitive' } }
        : {}),
    };

    const [presentaciones, total] = await this.prisma.$transaction([
      this.prisma.presentacion.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.presentacion.count({ where }),
    ]);

    return {
      data: presentaciones.map((presentacion) =>
        PresentacionMapper.toDomain(presentacion),
      ),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async update(
    id: number,
    params: UpdatePresentacionParams,
  ): Promise<PresentacionEntity> {
    const presentacion = await this.prisma.presentacion.update({
      where: { id },
      data: params,
    });

    return PresentacionMapper.toDomain(presentacion);
  }

  async setStatus(id: number, estado: boolean): Promise<PresentacionEntity> {
    const presentacion = await this.prisma.presentacion.update({
      where: { id },
      data: { estado: estado },
    });

    return PresentacionMapper.toDomain(presentacion);
  }

  async existsByCantidadAndUnidadMedida(
    cantidad: number,
    unidad_medida: UnidadMedidaPresentacion,
    excludeId?: number,
  ): Promise<boolean> {
    const where: Prisma.PresentacionWhereInput = {
      cantidad,
      unidad_medida,
      ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
    };

    const presentacion = await this.prisma.presentacion.findFirst({
      where,
      select: { id: true },
    });

    return presentacion !== null;
  }
}
