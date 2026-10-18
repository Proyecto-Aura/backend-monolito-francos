import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { SerieComprobanteEntity } from '../../domain/entities/serie-comprobante.entity';
import { TipoComprobante } from '../../domain/enums/sales.enums';
import { ResourceConflictError } from '../../domain/errors/sales-domain.errors';
import { SerieComprobanteRepository } from '../../domain/repositories/serie-comprobante.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CorrelativoReservado,
  CreateSerieComprobanteParams,
  ListSeriesComprobanteParams,
  UpdateSerieComprobanteParams,
} from '../../domain/repositories/types/serie-comprobante-repository.types';
import { SerieComprobanteMapper } from '../mappers/serie-comprobante.mapper';

// P2002 llega por `uq_serie_comprobante_serie` o por el índice parcial
// `uq_serie_activa_por_tipo` cuando dos peticiones ganan la carrera al
// chequeo previo del caso de uso.
const translateUniqueViolation = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw new ResourceConflictError(
      'Ya existe una serie con ese código o una serie activa del mismo tipo',
    );
  }
  throw error;
};

@Injectable()
export class PrismaSerieComprobanteRepository implements SerieComprobanteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    params: CreateSerieComprobanteParams,
  ): Promise<SerieComprobanteEntity> {
    try {
      const serie = await this.prisma.serieComprobante.create({
        data: params,
      });
      return SerieComprobanteMapper.toDomain(serie);
    } catch (error) {
      return translateUniqueViolation(error);
    }
  }

  async findById(id: number): Promise<SerieComprobanteEntity | null> {
    const serie = await this.prisma.serieComprobante.findUnique({
      where: { id },
    });
    return serie ? SerieComprobanteMapper.toDomain(serie) : null;
  }

  async findMany(
    params: ListSeriesComprobanteParams,
  ): Promise<PaginatedResult<SerieComprobanteEntity>> {
    // Prisma no compara columnas con aritmética: los ids por agotar salen de SQL.
    const idsPorAgotar =
      params.por_agotar === undefined ? [] : await this.findIdsPorAgotar();

    const where: Prisma.SerieComprobanteWhereInput = {
      ...(params.tipo === undefined ? {} : { tipo: params.tipo }),
      ...(params.estado === undefined ? {} : { estado: params.estado }),
      ...(params.por_agotar === undefined
        ? {}
        : {
            id: params.por_agotar
              ? { in: idsPorAgotar }
              : { notIn: idsPorAgotar },
          }),
    };

    const [series, total] = await this.prisma.$transaction([
      this.prisma.serieComprobante.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: [{ tipo: 'asc' }, { serie: 'asc' }],
      }),
      this.prisma.serieComprobante.count({ where }),
    ]);

    return {
      data: series.map((serie) => SerieComprobanteMapper.toDomain(serie)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async findActivas(): Promise<SerieComprobanteEntity[]> {
    const series = await this.prisma.serieComprobante.findMany({
      where: { estado: true },
      orderBy: [{ tipo: 'asc' }, { serie: 'asc' }],
    });
    return series.map((serie) => SerieComprobanteMapper.toDomain(serie));
  }

  async findActivaByTipo(
    tipo: TipoComprobante,
  ): Promise<SerieComprobanteEntity | null> {
    const serie = await this.prisma.serieComprobante.findFirst({
      where: { tipo, estado: true },
    });
    return serie ? SerieComprobanteMapper.toDomain(serie) : null;
  }

  async existsByTipo(tipo: TipoComprobante): Promise<boolean> {
    const serie = await this.prisma.serieComprobante.findFirst({
      where: { tipo },
      select: { id: true },
    });
    return serie !== null;
  }

  async existsBySerie(serie: string, excludeId?: number): Promise<boolean> {
    const found = await this.prisma.serieComprobante.findFirst({
      where: {
        serie,
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    return found !== null;
  }

  async existsActivaByTipo(
    tipo: TipoComprobante,
    excludeId?: number,
  ): Promise<boolean> {
    const found = await this.prisma.serieComprobante.findFirst({
      where: {
        tipo,
        estado: true,
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    return found !== null;
  }

  async update(
    id: number,
    params: UpdateSerieComprobanteParams,
    expectedCorrelativoActual?: number,
  ): Promise<SerieComprobanteEntity> {
    try {
      if (expectedCorrelativoActual === undefined) {
        const serie = await this.prisma.serieComprobante.update({
          where: { id },
          data: params,
        });
        return SerieComprobanteMapper.toDomain(serie);
      }

      const serie = await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.serieComprobante.updateMany({
          where: { id, correlativo_actual: expectedCorrelativoActual },
          data: params,
        });
        if (count === 0) {
          throw new ResourceConflictError(
            'La serie emitió un número mientras se editaba; vuelve a intentarlo',
          );
        }
        return tx.serieComprobante.findUniqueOrThrow({ where: { id } });
      });
      return SerieComprobanteMapper.toDomain(serie);
    } catch (error) {
      return translateUniqueViolation(error);
    }
  }

  async setStatus(
    id: number,
    estado: boolean,
  ): Promise<SerieComprobanteEntity> {
    try {
      const serie = await this.prisma.serieComprobante.update({
        where: { id },
        data: { estado },
      });
      return SerieComprobanteMapper.toDomain(serie);
    } catch (error) {
      return translateUniqueViolation(error);
    }
  }

  // Un único UPDATE ... RETURNING: PostgreSQL bloquea la fila, así que las
  // reservas concurrentes se serializan y cada una recibe un número distinto.
  // La condición de rango y estado impide entregar números fuera de la serie.
  async reservarSiguiente(
    tipo: TipoComprobante,
  ): Promise<CorrelativoReservado | null> {
    const filas = await this.prisma.$queryRaw<
      { id: number; serie: string; numero: number }[]
    >`
      UPDATE "commerce"."serie_comprobante"
      SET "correlativo_actual" = "correlativo_actual" + 1,
          "updated_at" = now()
      WHERE "tipo" = ${tipo}::"commerce"."tipo_comprobante"
        AND "estado" = true
        AND "correlativo_actual" < "correlativo_fin"
      RETURNING "id", "serie", "correlativo_actual" AS "numero"
    `;

    const [fila] = filas;
    return fila
      ? { serie_id: fila.id, serie: fila.serie, numero: fila.numero }
      : null;
  }

  private async findIdsPorAgotar(): Promise<number[]> {
    const filas = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT "id" FROM "commerce"."serie_comprobante"
      WHERE "estado" = true
        AND "correlativo_fin" - "correlativo_actual" <= "umbral_alerta"
    `;
    return filas.map(({ id }) => id);
  }
}
