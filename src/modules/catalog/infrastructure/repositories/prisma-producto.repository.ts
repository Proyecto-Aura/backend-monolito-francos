import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductoEntity } from '../../domain/entities';
import { ProductoRepository } from '../../domain/repositories/producto.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CreateProductoParams,
  CreateProductoWithPresentacionesParams,
  ProductoCatalogo,
  ListProductosParams,
  UpdateProductoParams,
  UpdateProductoWithPresentacionesParams,
} from '../../domain/repositories/types/producto-repository.types';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ProductoMapper } from '../mappers/producto.mapper';
import { ProductoPresentacionMapper } from '../mappers/producto_presentacion.mapper';
import { PromocionMapper } from '../mappers/promocion.mapper';

const productoCatalogoInclude = {
  producto_presentaciones: {
    include: {
      promociones: true,
    },
  },
} satisfies Prisma.ProductoInclude;

type PrismaProductoCatalogo = Prisma.ProductoGetPayload<{
  include: typeof productoCatalogoInclude;
}>;

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
  ): Promise<ProductoCatalogo> {
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

      for (const productoPresentacion of params.producto_presentaciones) {
        const { promociones, ...productoPresentacionData } =
          productoPresentacion;
        const productoPresentacionCreada = await tx.productoPresentacion.create(
          {
            data: {
              ...productoPresentacionData,
              producto_id: producto.id,
              sku: `FR-P${producto.id}-PR${productoPresentacion.presentacion_id}`,
            },
          },
        );

        for (const promocion of promociones) {
          await tx.promocion.create({
            data: {
              ...promocion,
              producto_presentacion_id: productoPresentacionCreada.id,
            },
          });
        }
      }

      const productoCreado = await tx.producto.findUnique({
        where: { id: producto.id },
        include: productoCatalogoInclude,
      });

      if (!productoCreado) {
        throw new Error('No se pudo recuperar el producto creado');
      }

      return this.toCatalogo(productoCreado);
    });
  }

  async findById(id: number): Promise<ProductoCatalogo | null> {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: productoCatalogoInclude,
    });
    return producto ? this.toCatalogo(producto) : null;
  }

  async findMany(
    params: ListProductosParams,
  ): Promise<PaginatedResult<ProductoCatalogo>> {
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
        include: productoCatalogoInclude,
      }),
      this.prisma.producto.count({ where }),
    ]);

    return {
      data: productos.map((producto) => this.toCatalogo(producto)),
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

  async updateWithPresentaciones(
    id: number,
    params: UpdateProductoWithPresentacionesParams,
  ): Promise<ProductoCatalogo> {
    return this.prisma.$transaction(async (tx) => {
      const { producto_presentaciones = [], ...productoData } = params;

      await tx.producto.update({
        where: { id },
        data: productoData,
      });

      for (const productoPresentacion of producto_presentaciones) {
        const {
          id: productoPresentacionId,
          promociones,
          ...presentacionData
        } = productoPresentacion;

        await tx.productoPresentacion.update({
          where: { id: productoPresentacionId },
          data: presentacionData,
        });

        for (const promocion of promociones ?? []) {
          const { id: promocionId, ...promocionData } = promocion;

          if (promocionId === undefined) {
            await tx.promocion.create({
              data: {
                ...promocionData,
                producto_presentacion_id: productoPresentacionId,
              },
            });
          } else {
            await tx.promocion.update({
              where: { id: promocionId },
              data: promocionData,
            });
          }
        }
      }

      const productoActualizado = await tx.producto.findUnique({
        where: { id },
        include: productoCatalogoInclude,
      });

      if (!productoActualizado) {
        throw new Error('No se pudo recuperar el producto actualizado');
      }

      return this.toCatalogo(productoActualizado);
    });
  }

  async setStatus(id: number, estado: boolean): Promise<ProductoEntity> {
    const producto = await this.prisma.producto.update({
      where: { id },
      data: { estado: estado },
    });
    return ProductoMapper.toDomain(producto);
  }

  private toCatalogo(producto: PrismaProductoCatalogo): ProductoCatalogo {
    return {
      ...ProductoMapper.toDomain(producto),
      producto_presentaciones: producto.producto_presentaciones.map(
        (productoPresentacion) => ({
          ...ProductoPresentacionMapper.toDomain(productoPresentacion),
          promociones: productoPresentacion.promociones.map((promocion) =>
            PromocionMapper.toDomain(promocion),
          ),
        }),
      ),
    };
  }
}
