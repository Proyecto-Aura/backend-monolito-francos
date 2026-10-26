import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { MovimientoProductoTerminadoEntity } from '../../domain/entities';
import { MovimientoProductoTerminadoRepository } from '../../domain/repositories/movimiento-producto-terminado.repository';
import {
  CreateMovimientoProductoTerminadoParams,
  ListMovimientoProductoTerminadoParams,
} from '../../domain/repositories/types/movimiento-producto-terminado-repository.types';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';
import { MovimientoProductoTerminadoMapper } from '../mappers/movimiento-producto-terminado.mapper';

// Embebido en cada movimiento (codigo_lote, producto_*) para que el front no
// tenga que resolver el lote ni el catálogo aparte en listados.
const INCLUDE_LOTE_Y_CATALOGO = {
  lote_producto_terminado: {
    select: {
      codigo_lote: true,
      producto_terminado: {
        select: {
          id: true,
          producto_presentacion: {
            select: {
              sku: true,
              producto_id: true,
              presentacion_id: true,
              producto: {
                select: {
                  nombre: true,
                  categoria_id: true,
                  categoria: { select: { nombre: true } },
                },
              },
              presentacion: { select: { cantidad: true, unidad_medida: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.MovimientoProductoTerminadoInclude;

@Injectable()
export class PrismaMovimientoProductoTerminadoRepository implements MovimientoProductoTerminadoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    params: CreateMovimientoProductoTerminadoParams,
  ): Promise<MovimientoProductoTerminadoEntity> {
    const movimiento = await this.prisma.movimientoProductoTerminado.create({
      data: params,
      include: INCLUDE_LOTE_Y_CATALOGO,
    });

    return MovimientoProductoTerminadoMapper.toDomain(movimiento);
  }

  async createMany(
    paramsList: CreateMovimientoProductoTerminadoParams[],
  ): Promise<MovimientoProductoTerminadoEntity[]> {
    return this.prisma
      .$transaction(
        paramsList.map((params) =>
          this.prisma.movimientoProductoTerminado.create({
            data: params,
            include: INCLUDE_LOTE_Y_CATALOGO,
          }),
        ),
      )
      .then((movimientos) =>
        movimientos.map((movimiento) =>
          MovimientoProductoTerminadoMapper.toDomain(movimiento),
        ),
      );
  }

  async findById(
    id: number,
  ): Promise<MovimientoProductoTerminadoEntity | null> {
    const movimiento = await this.prisma.movimientoProductoTerminado.findUnique(
      {
        where: { id },
        include: INCLUDE_LOTE_Y_CATALOGO,
      },
    );

    return movimiento
      ? MovimientoProductoTerminadoMapper.toDomain(movimiento)
      : null;
  }

  async findMany(
    params: ListMovimientoProductoTerminadoParams,
  ): Promise<PaginatedResult<MovimientoProductoTerminadoEntity>> {
    const where: Prisma.MovimientoProductoTerminadoWhereInput = {
      ...(params.lote_producto_terminado_id === undefined
        ? {}
        : { lote_producto_terminado_id: params.lote_producto_terminado_id }),
      ...(params.tipo ? { tipo: params.tipo } : {}),
      // producto_terminado_id y search filtran por el mismo camino
      // (lote_producto_terminado.producto_terminado), así que van juntos en
      // un único objeto para no pisarse entre sí.
      ...(params.producto_terminado_id === undefined && !params.search
        ? {}
        : {
            lote_producto_terminado: {
              producto_terminado: {
                ...(params.producto_terminado_id === undefined
                  ? {}
                  : { id: params.producto_terminado_id }),
                ...(params.search
                  ? {
                      producto_presentacion: {
                        OR: [
                          {
                            sku: {
                              contains: params.search,
                              mode: 'insensitive',
                            },
                          },
                          {
                            producto: {
                              nombre: {
                                contains: params.search,
                                mode: 'insensitive',
                              },
                            },
                          },
                        ],
                      },
                    }
                  : {}),
              },
            },
          }),
      ...(params.fecha_desde || params.fecha_hasta
        ? {
            fecha: {
              ...(params.fecha_desde ? { gte: params.fecha_desde } : {}),
              ...(params.fecha_hasta ? { lte: params.fecha_hasta } : {}),
            },
          }
        : {}),
    };

    const [movimientos, total] = await this.prisma.$transaction([
      this.prisma.movimientoProductoTerminado.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { fecha: 'desc' },
        include: INCLUDE_LOTE_Y_CATALOGO,
      }),
      this.prisma.movimientoProductoTerminado.count({ where }),
    ]);

    return {
      data: movimientos.map((movimiento) =>
        MovimientoProductoTerminadoMapper.toDomain(movimiento),
      ),
      total,
      page: params.page,
      limit: params.limit,
    };
  }
}
