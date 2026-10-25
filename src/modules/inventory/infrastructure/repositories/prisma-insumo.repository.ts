import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { InsumoEntity } from '../../domain/entities';
import { NivelStockInsumo } from '../../domain/enums';
import { InsumoRepository } from '../../domain/repositories/insumo.repository';
import {
  CreateInsumoParams,
  IndicadoresInsumo,
  ListInsumosParams,
  UpdateInsumoParams,
} from '../../domain/repositories/types/insumo-repository.types';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';
import { InsumoMapper } from '../mappers/insumo.mapper';

// % de stock_maximo a partir del cual un insumo se marca "alto" en los
// indicadores del dashboard.
const UMBRAL_ALTO_PORCENTAJE = 90;

@Injectable()
export class PrismaInsumoRepository implements InsumoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateInsumoParams): Promise<InsumoEntity> {
    return this.prisma.$transaction(async (tx) => {
      // El sku lo exige RF-A049 con el formato FR-INS-{id}, así que primero se
      // reserva el id de la secuencia y luego se crea la fila con ambos ya fijos.
      const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval(pg_get_serial_sequence('commerce.insumo', 'id')) AS nextval
      `;
      const id = Number(nextval);
      const sku = `FR-INS-${String(id).padStart(3, '0')}`;

      const insumo = await tx.insumo.create({
        data: { id, sku, ...params },
      });

      return InsumoMapper.toDomain(insumo);
    });
  }

  async findById(id: number): Promise<InsumoEntity | null> {
    const insumo = await this.prisma.insumo.findUnique({ where: { id } });
    return insumo ? InsumoMapper.toDomain(insumo) : null;
  }

  // Mismo criterio de /insumos/indicadores (getIndicadores más abajo), pero
  // por fila: stock_actual/stock_minimo/stock_maximo no se pueden comparar
  // entre columnas con el query builder de Prisma, así que se resuelven los
  // ids por SQL y se filtra por ellos en el findMany normal.
  private nivelCondition(nivel: NivelStockInsumo): Prisma.Sql {
    switch (nivel) {
      case NivelStockInsumo.AGOTADO:
        return Prisma.sql`stock_actual <= 0`;
      case NivelStockInsumo.BAJO:
        return Prisma.sql`stock_actual > 0 AND stock_actual < stock_minimo`;
      case NivelStockInsumo.ALTO:
        return Prisma.sql`stock_actual >= stock_minimo AND (stock_actual / stock_maximo) * 100 > ${UMBRAL_ALTO_PORCENTAJE}`;
      case NivelStockInsumo.NORMAL:
        return Prisma.sql`stock_actual >= stock_minimo AND (stock_actual / stock_maximo) * 100 <= ${UMBRAL_ALTO_PORCENTAJE}`;
    }
  }

  async findMany(
    params: ListInsumosParams,
  ): Promise<PaginatedResult<InsumoEntity>> {
    let idsPorNivel: number[] | undefined;
    if (params.nivel) {
      const filas = await this.prisma.$queryRaw<{ id: number }[]>`
        SELECT id FROM commerce.insumo WHERE ${this.nivelCondition(params.nivel)}
      `;
      idsPorNivel = filas.map((fila) => fila.id);
    }

    const where: Prisma.InsumoWhereInput = {
      ...(params.estado === undefined ? {} : { estado: params.estado }),
      ...(params.tipo ? { tipo: params.tipo } : {}),
      ...(idsPorNivel ? { id: { in: idsPorNivel } } : {}),
      ...(params.search
        ? {
            OR: [
              { sku: { contains: params.search, mode: 'insensitive' } },
              { nombre: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [insumos, total] = await this.prisma.$transaction([
      this.prisma.insumo.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.insumo.count({ where }),
    ]);

    return {
      data: insumos.map((insumo) => InsumoMapper.toDomain(insumo)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async update(id: number, params: UpdateInsumoParams): Promise<InsumoEntity> {
    const insumo = await this.prisma.insumo.update({
      where: { id },
      data: params,
    });

    return InsumoMapper.toDomain(insumo);
  }

  async setStatus(id: number, estado: boolean): Promise<InsumoEntity> {
    const insumo = await this.prisma.insumo.update({
      where: { id },
      data: { estado },
    });

    return InsumoMapper.toDomain(insumo);
  }

  async getIndicadores(): Promise<IndicadoresInsumo> {
    const [fila] = await this.prisma.$queryRaw<
      {
        agotado: bigint;
        bajo: bigint;
        alto: bigint;
        normal: bigint;
        total: bigint;
      }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE stock_actual <= 0) AS agotado,
        COUNT(*) FILTER (
          WHERE stock_actual > 0 AND stock_actual < stock_minimo
        ) AS bajo,
        COUNT(*) FILTER (
          WHERE stock_actual >= stock_minimo
            AND (stock_actual / stock_maximo) * 100 > ${UMBRAL_ALTO_PORCENTAJE}
        ) AS alto,
        COUNT(*) FILTER (
          WHERE stock_actual >= stock_minimo
            AND (stock_actual / stock_maximo) * 100 <= ${UMBRAL_ALTO_PORCENTAJE}
        ) AS normal,
        COUNT(*) AS total
      FROM commerce.insumo
      WHERE estado = true
    `;

    return {
      agotado: Number(fila.agotado),
      bajo: Number(fila.bajo),
      alto: Number(fila.alto),
      normal: Number(fila.normal),
      total: Number(fila.total),
    };
  }
}
