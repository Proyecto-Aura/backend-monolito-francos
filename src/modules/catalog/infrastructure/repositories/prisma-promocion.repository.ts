import { Injectable } from '@nestjs/common';
import { PromocionEntity } from '../../domain/entities';
import { PromocionRepository } from '../../domain/repositories/promocion.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CreatePromocionParams,
  ListPromocionesParams,
} from '../../domain/repositories/types/promocion-repository.types';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PromocionMapper } from '../mappers/promocion.mapper';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaPromocionRepository implements PromocionRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(params: CreatePromocionParams): Promise<PromocionEntity> {
    const promocion = await this.prisma.promocion.create({
      data: params,
    });

    return PromocionMapper.toDomain(promocion);
  }
  async findById(id: number): Promise<PromocionEntity | null> {
    const promocion = await this.prisma.promocion.findUnique({
      where: { id },
    });

    return promocion ? PromocionMapper.toDomain(promocion) : null;
  }
  async findMany(
    params: ListPromocionesParams,
  ): Promise<PaginatedResult<PromocionEntity>> {
    const where: Prisma.PromocionWhereInput = {
      ...(params.estado === undefined ? {} : { estado: params.estado }),
      ...(params.producto_presentacion_id
        ? { producto_presentacion_id: params.producto_presentacion_id }
        : {}),
      ...(params.search
        ? { nombre: { contains: params.search, mode: 'insensitive' } }
        : {}),
    };

    const [promociones, total] = await this.prisma.$transaction([
      this.prisma.promocion.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.promocion.count({
        where,
      }),
    ]);

    return {
      data: promociones.map((p) => PromocionMapper.toDomain(p)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }
  async existsByName(nombre: string, excludeId?: number): Promise<boolean> {
    const promocion = await this.prisma.promocion.findFirst({
      where: {
        nombre,
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
    });
    return promocion !== null;
  }
  async update(
    id: number,
    params: CreatePromocionParams,
  ): Promise<PromocionEntity> {
    const promocion = await this.prisma.promocion.update({
      where: { id },
      data: params,
    });

    return PromocionMapper.toDomain(promocion);
  }
  async setStatus(id: number, estado: boolean): Promise<PromocionEntity> {
    const promocion = await this.prisma.promocion.update({
      where: { id },
      data: { estado },
    });
    return PromocionMapper.toDomain(promocion);
  }
}
