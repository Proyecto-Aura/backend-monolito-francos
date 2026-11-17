import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { LoteInsumoEntity } from '../../domain/entities';
import { EstadoLoteInsumo } from '../../domain/enums';
import { LoteInsumoRepository } from '../../domain/repositories/lote-insumo.repository';
import {
  CreateLoteInsumoParams,
  ListLoteInsumosParams,
} from '../../domain/repositories/types/lote-insumo-repository.types';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';
import {
  DIAS_POR_VENCER,
  LoteInsumoMapper,
} from '../mappers/lote-insumo.mapper';

@Injectable()
export class PrismaLoteInsumoRepository implements LoteInsumoRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 'vencido' y 'por_vencer' no están en la columna estado (se calculan al
  // leer, ver LoteInsumoMapper), así que filtrar por ellos no puede ser un
  // simple `where: { estado }`: hay que traducirlos a la misma condición de
  // fecha que usa el mapper. 'activo' también se ajusta para no incluir los
  // que en realidad ya muestran como vencido/por_vencer.
  private estadoCondition(
    estado: EstadoLoteInsumo,
  ): Prisma.LoteInsumoWhereInput {
    if (estado === EstadoLoteInsumo.AGOTADO) {
      return { estado: 'agotado' };
    }

    const hoy = new Date();
    const limitePorVencer = new Date(hoy);
    limitePorVencer.setDate(limitePorVencer.getDate() + DIAS_POR_VENCER);

    if (estado === EstadoLoteInsumo.VENCIDO) {
      return { estado: 'activo', fecha_vencimiento: { lt: hoy } };
    }
    if (estado === EstadoLoteInsumo.POR_VENCER) {
      return {
        estado: 'activo',
        fecha_vencimiento: { gte: hoy, lte: limitePorVencer },
      };
    }
    // ACTIVO: sin fecha de vencimiento, o vence después de la ventana de
    // "por vencer".
    return {
      estado: 'activo',
      OR: [
        { fecha_vencimiento: null },
        { fecha_vencimiento: { gt: limitePorVencer } },
      ],
    };
  }

  async create(params: CreateLoteInsumoParams): Promise<LoteInsumoEntity> {
    const { razon, cantidad_inicial, ...loteParams } = params;

    return this.prisma.$transaction(async (tx) => {
      // Nace en 0: el movimiento "entrada" de abajo (vía trigger) lo deja
      // en cantidad_inicial, igual que cualquier otro movimiento de stock.
      const lote = await tx.loteInsumo.create({
        data: { ...loteParams, cantidad_inicial, cantidad_actual: 0 },
      });

      await tx.movimientoInsumo.create({
        data: {
          lote_insumo_id: lote.id,
          tipo: 'entrada',
          cantidad: cantidad_inicial,
          razon,
        },
      });

      const loteActualizado = await tx.loteInsumo.findUniqueOrThrow({
        where: { id: lote.id },
      });

      return LoteInsumoMapper.toDomain(loteActualizado);
    });
  }

  async findById(id: number): Promise<LoteInsumoEntity | null> {
    const lote = await this.prisma.loteInsumo.findUnique({ where: { id } });
    return lote ? LoteInsumoMapper.toDomain(lote) : null;
  }

  async findMany(
    params: ListLoteInsumosParams,
  ): Promise<PaginatedResult<LoteInsumoEntity>> {
    const where: Prisma.LoteInsumoWhereInput = {
      ...(params.activo === undefined ? {} : { activo: params.activo }),
      ...(params.insumo_id === undefined
        ? {}
        : { insumo_id: params.insumo_id }),
      ...(params.search
        ? { codigo_lote: { contains: params.search, mode: 'insensitive' } }
        : {}),
      // Cada condición sobre fecha_vencimiento va en su propio AND para que
      // estado (vencido/por_vencer) y el rango vence_desde/vence_hasta no se
      // pisen entre sí.
      AND: [
        ...(params.estado ? [this.estadoCondition(params.estado)] : []),
        ...(params.vence_desde || params.vence_hasta
          ? [
              {
                fecha_vencimiento: {
                  ...(params.vence_desde ? { gte: params.vence_desde } : {}),
                  ...(params.vence_hasta ? { lte: params.vence_hasta } : {}),
                },
              } satisfies Prisma.LoteInsumoWhereInput,
            ]
          : []),
      ],
    };

    const [lotes, total] = await this.prisma.$transaction([
      this.prisma.loteInsumo.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        // Lote más próximo a vencer primero; los sin fecha de vencimiento
        // (p.ej. insumos tipo empaque) van al final.
        orderBy: { fecha_vencimiento: { sort: 'asc', nulls: 'last' } },
      }),
      this.prisma.loteInsumo.count({ where }),
    ]);

    return {
      data: lotes.map((lote) => LoteInsumoMapper.toDomain(lote)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async existsByCodigoLote(codigo_lote: string): Promise<boolean> {
    const lote = await this.prisma.loteInsumo.findFirst({
      where: { codigo_lote: { equals: codigo_lote, mode: 'insensitive' } },
      select: { id: true },
    });

    return lote !== null;
  }

  async setActivo(id: number, activo: boolean): Promise<LoteInsumoEntity> {
    const lote = await this.prisma.loteInsumo.update({
      where: { id },
      data: { activo },
    });

    return LoteInsumoMapper.toDomain(lote);
  }

  async findDisponiblesParaSalida(
    insumo_id: number,
  ): Promise<LoteInsumoEntity[]> {
    const lotes = await this.prisma.loteInsumo.findMany({
      where: {
        insumo_id,
        estado: 'activo',
        activo: true,
        cantidad_actual: { gt: 0 },
        // 'vencido' no se persiste en estado (se deriva al leer, ver
        // LoteInsumoMapper): acá se excluye igual, por fecha, para que la
        // salida (FEFO) nunca reparta un lote ya vencido aunque la columna
        // siga en 'activo'.
        OR: [
          { fecha_vencimiento: null },
          { fecha_vencimiento: { gte: new Date() } },
        ],
      },
      orderBy: [
        { fecha_vencimiento: { sort: 'asc', nulls: 'last' } },
        { id: 'asc' },
      ],
    });

    return lotes.map((lote) => LoteInsumoMapper.toDomain(lote));
  }
}
