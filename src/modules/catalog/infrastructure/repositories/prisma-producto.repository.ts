import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductoEntity } from '../../domain/entities';
import { ProductoRepository } from '../../domain/repositories/producto.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CreateProductoParams,
  CreateProductoWithPresentacionesParams,
  ProductoWithPresentaciones,
  ListProductosParams,
  UpdateProductoParams,
} from '../../domain/repositories/types/producto-repository.types';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ProductoMapper } from '../mappers/producto.mapper';
import { ProductoPresentacionMapper } from '../mappers/producto_presentacion.mapper';

@Injectable()
export class PrismaProductoRepository implements ProductoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateProductoParams): Promise<ProductoEntity> {
    const producto = await this.prisma.producto.create({
      data: params,
    });
    return ProductoMapper.toDomain(producto);
  }

  // Inicia transaccion: crear producto con presentaciones
  async createWithPresentaciones(
    params: CreateProductoWithPresentacionesParams,
  ): Promise<ProductoWithPresentaciones> {
    return this.prisma.$transaction(async (tx) => {
      const producto = await tx.producto.create({
        data: {
          nombre: params.nombre,
          categoria_id: params.categoria_id,
          descripcion: params.descripcion,
          estado: params.estado,
          destacado: params.destacado,
        },
      });

      const producto_presentaciones = await Promise.all(
        params.producto_presentaciones.map((p) =>
          tx.productoPresentacion.create({
            data: {
              ...p,
              producto_id: producto.id,
              sku: `FR-P${producto.id}-PR${p.presentacion_id}`,
              // Cada presentación nace con su producto terminado (RF-A024).
              producto_terminado: { create: {} },
            },
          }),
        ),
      );

      return {
        ...ProductoMapper.toDomain(producto),
        producto_presentaciones: producto_presentaciones.map((pro) =>
          ProductoPresentacionMapper.toDomain(pro),
        ),
      };
    });
  }

  async findById(id: number): Promise<ProductoEntity | null> {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
    });
    return producto ? ProductoMapper.toDomain(producto) : null;
  }

  async findMany(
    params: ListProductosParams,
  ): Promise<PaginatedResult<ProductoEntity>> {
    const where: Prisma.ProductoWhereInput = {
      ...(params.estado === undefined ? {} : { estado: params.estado }),
      ...(params.destacado === undefined
        ? {}
        : { destacado: params.destacado }),
      ...(params.categoria_id === undefined
        ? {}
        : { categoria_id: params.categoria_id }),
      ...(params.search
        ? {
            OR: [
              { nombre: { contains: params.search, mode: 'insensitive' } },
              { descripcion: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [productos, total] = await this.prisma.$transaction([
      this.prisma.producto.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.producto.count({ where }),
    ]);

    return {
      data: productos.map((producto) => ProductoMapper.toDomain(producto)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async existsByName(nombre: string, excludeId?: number): Promise<boolean> {
    const producto = await this.prisma.producto.findFirst({
      where: {
        nombre: { equals: nombre, mode: 'insensitive' },
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });

    return producto !== null;
  }

  async update(
    id: number,
    params: UpdateProductoParams,
  ): Promise<ProductoEntity> {
    const producto = await this.prisma.producto.update({
      where: { id },
      data: params,
    });

    return ProductoMapper.toDomain(producto);
  }

  async setStatus(id: number, estado: boolean): Promise<ProductoEntity> {
    const producto = await this.prisma.producto.update({
      where: { id },
      data: { estado: estado },
    });
    return ProductoMapper.toDomain(producto);
  }
}
