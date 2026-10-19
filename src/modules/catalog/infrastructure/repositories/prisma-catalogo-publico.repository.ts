import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CatalogoPublicoRepository } from '../../domain/repositories/catalogo-publico.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CatalogoPublicoItem,
  CatalogoPublicoProducto,
  ListCatalogoPublicoParams,
  OrdenCatalogoPublico,
} from '../../domain/repositories/types/catalogo-publico-repository.types';
import {
  CATALOGO_PUBLICO_ITEM_INCLUDE,
  CATALOGO_PUBLICO_PRODUCTO_INCLUDE,
  CatalogoPublicoMapper,
  PRESENTACION_VISIBLE_WHERE,
  PRODUCTO_VISIBLE_WHERE,
} from '../mappers/catalogo-publico.mapper';

@Injectable()
export class PrismaCatalogoPublicoRepository implements CatalogoPublicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findItems(
    params: ListCatalogoPublicoParams,
  ): Promise<PaginatedResult<CatalogoPublicoItem>> {
    // Los filtros de visibilidad son fijos; el cliente solo elige categoría y
    // búsqueda por nombre.
    const where: Prisma.ProductoPresentacionWhereInput = {
      ...PRESENTACION_VISIBLE_WHERE,
      producto: {
        ...PRODUCTO_VISIBLE_WHERE,
        ...(params.categoria_id === undefined
          ? {}
          : { categoria_id: params.categoria_id }),
        ...(params.q
          ? { nombre: { contains: params.q, mode: 'insensitive' } }
          : {}),
      },
    };

    const [filas, total] = await this.prisma.$transaction([
      this.prisma.productoPresentacion.findMany({
        where,
        include: CATALOGO_PUBLICO_ITEM_INCLUDE(params.fecha_referencia),
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: this.orderBy(params.orden),
      }),
      this.prisma.productoPresentacion.count({ where }),
    ]);

    return {
      data: filas.map((fila) => CatalogoPublicoMapper.toItem(fila)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async findProducto(
    id: number,
    fecha_referencia: Date,
  ): Promise<CatalogoPublicoProducto | null> {
    const producto = await this.prisma.producto.findFirst({
      where: { id, ...PRODUCTO_VISIBLE_WHERE },
      include: CATALOGO_PUBLICO_PRODUCTO_INCLUDE(fecha_referencia),
    });

    // Un producto sin presentaciones visibles tampoco se ve en el Portal B.
    if (!producto || producto.producto_presentaciones.length === 0) {
      return null;
    }

    return CatalogoPublicoMapper.toProducto(producto);
  }

  // El id desempata para que la paginación sea estable.
  private orderBy(
    orden: OrdenCatalogoPublico | undefined,
  ): Prisma.ProductoPresentacionOrderByWithRelationInput[] {
    switch (orden) {
      case OrdenCatalogoPublico.PRECIO_ASC:
        return [{ precio_unitario: 'asc' }, { id: 'asc' }];
      case OrdenCatalogoPublico.PRECIO_DESC:
        return [{ precio_unitario: 'desc' }, { id: 'asc' }];
      default:
        // RF-A021: los destacados primero.
        return [
          { producto: { destacado: 'desc' } },
          { producto: { nombre: 'asc' } },
          { id: 'asc' },
        ];
    }
  }
}
