import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ProductoPresentacionEntity } from '../../domain/entities';
import { NivelStockProductoTerminado } from '../../domain/enums';
import { ProductoPresentacionRepository } from '../../domain/repositories/producto_presentacion.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CreateProductoPresentacionParams,
  ListProductoPresentacionesParams,
  ProductoPresentacionCatalogo,
  UpdateProductoPresentacionParams,
} from '../../domain/repositories/types/producto_presentacion-repository.types';
import { Injectable } from '@nestjs/common';
import {
  PRODUCTO_PRESENTACION_CATALOGO_INCLUDE,
  ProductoPresentacionMapper,
} from '../mappers/producto_presentacion.mapper';
import { Prisma } from '@prisma/client';

// Mismo umbral que /productos-terminados/indicadores (módulo inventory).
const UMBRAL_ALTO_PORCENTAJE = 90;

@Injectable()
export class PrismaProductoPresentacionRepository implements ProductoPresentacionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // stock_actual/stock_minimo/stock_maximo no se pueden comparar entre
  // columnas con el query builder de Prisma, así que se resuelven los
  // producto_presentacion_id por SQL y se filtra por ellos en el findMany
  // normal (mismo patrón que el filtro "nivel" de /insumos).
  private nivelCondition(nivel: NivelStockProductoTerminado): Prisma.Sql {
    switch (nivel) {
      case NivelStockProductoTerminado.AGOTADO:
        return Prisma.sql`stock_actual <= 0`;
      case NivelStockProductoTerminado.BAJO:
        return Prisma.sql`stock_actual > 0 AND stock_actual < stock_minimo`;
      case NivelStockProductoTerminado.ALTO:
        return Prisma.sql`stock_actual >= stock_minimo AND stock_maximo IS NOT NULL AND (stock_actual / stock_maximo) * 100 > ${UMBRAL_ALTO_PORCENTAJE}`;
      case NivelStockProductoTerminado.NORMAL:
        return Prisma.sql`stock_actual >= stock_minimo AND (stock_maximo IS NULL OR (stock_actual / stock_maximo) * 100 <= ${UMBRAL_ALTO_PORCENTAJE})`;
    }
  }

  async create(
    params: CreateProductoPresentacionParams,
  ): Promise<ProductoPresentacionEntity> {
    // Escritura anidada: la presentación y su producto terminado (stock 0,
    // mínimo 1) se crean juntos o no se crea ninguno.
    const producto_presentacion = await this.prisma.productoPresentacion.create(
      {
        data: { ...params, producto_terminado: { create: {} } },
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
  ): Promise<PaginatedResult<ProductoPresentacionCatalogo>> {
    let idsPorNivel: number[] | undefined;
    if (params.nivel) {
      const filas = await this.prisma.$queryRaw<
        { producto_presentacion_id: number }[]
      >`
        SELECT producto_presentacion_id FROM commerce.producto_terminado
        WHERE ${this.nivelCondition(params.nivel)}
      `;
      idsPorNivel = filas.map((fila) => fila.producto_presentacion_id);
    }

    const where: Prisma.ProductoPresentacionWhereInput = {
      ...(params.estado === undefined ? {} : { estado: params.estado }),
      ...(params.presentacion_id === undefined
        ? {}
        : { presentacion_id: params.presentacion_id }),
      ...(params.categoria_id === undefined
        ? {}
        : { producto: { categoria_id: params.categoria_id } }),
      ...(idsPorNivel === undefined ? {} : { id: { in: idsPorNivel } }),
      // Cada condición con OR va en su propio AND para que no se pisen entre sí.
      AND: [
        ...(params.search
          ? [
              {
                OR: [
                  { sku: { contains: params.search, mode: 'insensitive' } },
                  { slug: { contains: params.search, mode: 'insensitive' } },
                  {
                    producto: {
                      nombre: { contains: params.search, mode: 'insensitive' },
                    },
                  },
                ],
              } satisfies Prisma.ProductoPresentacionWhereInput,
            ]
          : []),
        ...(params.con_stock === undefined
          ? []
          : [
              params.con_stock
                ? { producto_terminado: { is: { stock_actual: { gt: 0 } } } }
                : {
                    // Agotada: sin stock, o sin producto terminado todavía.
                    OR: [
                      { producto_terminado: { is: null } },
                      {
                        producto_terminado: {
                          is: { stock_actual: { lte: 0 } },
                        },
                      },
                    ],
                  },
            ]),
      ],
    };

    const [producto_presentaciones, total] = await this.prisma.$transaction([
      this.prisma.productoPresentacion.findMany({
        where,
        include: PRODUCTO_PRESENTACION_CATALOGO_INCLUDE(
          params.fecha_referencia,
        ),
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: [{ producto: { nombre: 'asc' } }, { id: 'asc' }],
      }),
      this.prisma.productoPresentacion.count({ where }),
    ]);

    return {
      data: producto_presentaciones.map((pp) =>
        ProductoPresentacionMapper.toCatalogo(pp),
      ),
      total,
      page: params.page,
      limit: params.limit,
    };
  }
  async existsBySlug(slug: string): Promise<boolean> {
    const productoPresentacion =
      await this.prisma.productoPresentacion.findUnique({
        where: { slug },
        select: { id: true },
      });

    return productoPresentacion !== null;
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
