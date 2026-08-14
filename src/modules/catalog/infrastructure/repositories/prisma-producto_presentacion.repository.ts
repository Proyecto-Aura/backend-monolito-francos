import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ProductoPresentacionEntity } from '../../domain/entities';
import { ProductoPresentacionRepository } from '../../domain/repositories/producto_presentacion.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CreateProductoPresentacionParams,
  ListProductoPresentacionesParams,
  UpdateProductoPresentacionParams,
} from '../../domain/repositories/types/producto_presentacion-repository.types';
import { Injectable } from '@nestjs/common';
import { ProductoPresentacionMapper } from '../mappers/producto_presentacion.mapper';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaProductoPresentacionRepository implements ProductoPresentacionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    params: CreateProductoPresentacionParams,
  ): Promise<ProductoPresentacionEntity> {
    const producto_presentacion = await this.prisma.productoPresentacion.create(
      {
        data: params,
      },
    );

    return ProductoPresentacionMapper.toDomain(producto_presentacion);
  }
  async findById(id: number): Promise<ProductoPresentacionEntity | null> {
    const producto_presentacion =
      await this.prisma.productoPresentacion.findUnique({ where: { id } });
    return producto_presentacion
      ? ProductoPresentacionMapper.toDomain(producto_presentacion)
      : null;
  }
  async findMany(
    params: ListProductoPresentacionesParams,
  ): Promise<PaginatedResult<ProductoPresentacionEntity>> {
    const where: Prisma.ProductoPresentacionWhereInput = {
      ...(params.estado === undefined ? {} : { estado: params.estado }),
      ...(params.search
        ? {
            OR: [
              { sku: { contains: params.search, mode: 'insensitive' } },
              { slug: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [producto_presentaciones, total] = await this.prisma.$transaction([
      this.prisma.productoPresentacion.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.productoPresentacion.count({ where }),
    ]);

    return {
      data: producto_presentaciones.map((pp) =>
        ProductoPresentacionMapper.toDomain(pp),
      ),
      total,
      page: params.page,
      limit: params.limit,
    };
  }
  async existsBySku(sku: string, excludeId?: number): Promise<boolean> {
    const producto_presentacion =
      await this.prisma.productoPresentacion.findFirst({
        where: {
          sku,
          ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
        },
        select: { id: true },
      });

    return producto_presentacion !== null;
  }
  async update(
    id: number,
    params: UpdateProductoPresentacionParams,
  ): Promise<ProductoPresentacionEntity> {
    const producto_presentacion = await this.prisma.productoPresentacion.update(
      {
        where: { id },
        data: params,
      },
    );

    return ProductoPresentacionMapper.toDomain(producto_presentacion);
  }
  async setStatus(
    id: number,
    estado: boolean,
  ): Promise<ProductoPresentacionEntity> {
    const producto_presentacion = await this.prisma.productoPresentacion.update(
      {
        where: { id },
        data: { estado },
      },
    );

    return ProductoPresentacionMapper.toDomain(producto_presentacion);
  }
}
