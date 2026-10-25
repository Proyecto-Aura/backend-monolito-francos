import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { MovimientoInsumoEntity } from '../../domain/entities';
import { MovimientoInsumoRepository } from '../../domain/repositories/movimiento-insumo.repository';
import {
  CreateMovimientoInsumoParams,
  ListMovimientoInsumoParams,
} from '../../domain/repositories/types/movimiento-insumo-repository.types';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';
import { MovimientoInsumoMapper } from '../mappers/movimiento-insumo.mapper';

// Embebido en cada movimiento (codigo_lote, insumo_*) para que el front no
// tenga que resolver el lote ni el insumo aparte en listados.
const INCLUDE_LOTE_E_INSUMO = {
  lote_insumo: {
    select: {
      codigo_lote: true,
      insumo: {
        select: { id: true, nombre: true, sku: true, unidad_medida: true },
      },
    },
  },
} satisfies Prisma.MovimientoInsumoInclude;

@Injectable()
export class PrismaMovimientoInsumoRepository implements MovimientoInsumoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    params: CreateMovimientoInsumoParams,
  ): Promise<MovimientoInsumoEntity> {
    const movimiento = await this.prisma.movimientoInsumo.create({
      data: params,
      include: INCLUDE_LOTE_E_INSUMO,
    });

    return MovimientoInsumoMapper.toDomain(movimiento);
  }

  async createMany(
    paramsList: CreateMovimientoInsumoParams[],
  ): Promise<MovimientoInsumoEntity[]> {
    return this.prisma
      .$transaction(
        paramsList.map((params) =>
          this.prisma.movimientoInsumo.create({
            data: params,
            include: INCLUDE_LOTE_E_INSUMO,
          }),
        ),
      )
      .then((movimientos) =>
        movimientos.map((movimiento) =>
          MovimientoInsumoMapper.toDomain(movimiento),
        ),
      );
  }

  async findById(id: number): Promise<MovimientoInsumoEntity | null> {
    const movimiento = await this.prisma.movimientoInsumo.findUnique({
      where: { id },
      include: INCLUDE_LOTE_E_INSUMO,
    });

    return movimiento ? MovimientoInsumoMapper.toDomain(movimiento) : null;
  }

  async findMany(
    params: ListMovimientoInsumoParams,
  ): Promise<PaginatedResult<MovimientoInsumoEntity>> {
    const where: Prisma.MovimientoInsumoWhereInput = {
      ...(params.lote_insumo_id === undefined
        ? {}
        : { lote_insumo_id: params.lote_insumo_id }),
      ...(params.tipo ? { tipo: params.tipo } : {}),
      // insumo_id y search filtran por el mismo camino (lote_insumo.insumo),
      // así que van juntos en un único objeto para no pisarse entre sí.
      ...(params.insumo_id === undefined && !params.search
        ? {}
        : {
            lote_insumo: {
              ...(params.insumo_id === undefined
                ? {}
                : { insumo_id: params.insumo_id }),
              ...(params.search
                ? {
                    insumo: {
                      OR: [
                        {
                          nombre: {
                            contains: params.search,
                            mode: 'insensitive',
                          },
                        },
                        {
                          sku: {
                            contains: params.search,
                            mode: 'insensitive',
                          },
                        },
                      ],
                    },
                  }
                : {}),
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
      this.prisma.movimientoInsumo.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { fecha: 'desc' },
        include: INCLUDE_LOTE_E_INSUMO,
      }),
      this.prisma.movimientoInsumo.count({ where }),
    ]);

    return {
      data: movimientos.map((movimiento) =>
        MovimientoInsumoMapper.toDomain(movimiento),
      ),
      total,
      page: params.page,
      limit: params.limit,
    };
  }
}
