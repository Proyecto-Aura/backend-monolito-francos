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

@Injectable()
export class PrismaMovimientoInsumoRepository implements MovimientoInsumoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    params: CreateMovimientoInsumoParams,
  ): Promise<MovimientoInsumoEntity> {
    const movimiento = await this.prisma.movimientoInsumo.create({
      data: params,
    });

    return MovimientoInsumoMapper.toDomain(movimiento);
  }

  async createMany(
    paramsList: CreateMovimientoInsumoParams[],
  ): Promise<MovimientoInsumoEntity[]> {
    return this.prisma
      .$transaction(
        paramsList.map((params) =>
          this.prisma.movimientoInsumo.create({ data: params }),
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
      ...(params.insumo_id === undefined
        ? {}
        : { lote_insumo: { insumo_id: params.insumo_id } }),
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
