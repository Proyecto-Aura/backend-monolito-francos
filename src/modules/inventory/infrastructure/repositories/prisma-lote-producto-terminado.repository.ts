import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { LoteProductoTerminadoEntity } from '../../domain/entities';
import { EstadoLoteProductoTerminado } from '../../domain/enums';
import { LoteProductoTerminadoRepository } from '../../domain/repositories/lote-producto-terminado.repository';
import { ListLoteProductoTerminadoParams } from '../../domain/repositories/types/lote-producto-terminado-repository.types';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';
import { DIAS_POR_VENCER } from '../mappers/lote-insumo.mapper';
import { LoteProductoTerminadoMapper } from '../mappers/lote-producto-terminado.mapper';

// Embebido en cada lote para que el front no tenga que resolver el catálogo
// aparte (mismo criterio que insumo_* en movimientos de insumo).
const INCLUDE_CATALOGO = {
  producto_terminado: {
    select: {
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
} satisfies Prisma.LoteProductoTerminadoInclude;

@Injectable()
export class PrismaLoteProductoTerminadoRepository implements LoteProductoTerminadoRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 'vencido' y 'por_vencer' no están en la columna estado (se calculan al
  // leer, ver LoteProductoTerminadoMapper): mismo patrón que
  // PrismaLoteInsumoRepository.estadoCondition.
  private estadoCondition(
    estado: EstadoLoteProductoTerminado,
  ): Prisma.LoteProductoTerminadoWhereInput {
    if (estado === EstadoLoteProductoTerminado.AGOTADO) {
      return { estado: 'agotado' };
    }

    const hoy = new Date();
    const limitePorVencer = new Date(hoy);
    limitePorVencer.setDate(limitePorVencer.getDate() + DIAS_POR_VENCER);

    if (estado === EstadoLoteProductoTerminado.VENCIDO) {
      return { estado: 'activo', fecha_vencimiento: { lt: hoy } };
    }
    if (estado === EstadoLoteProductoTerminado.POR_VENCER) {
      return {
        estado: 'activo',
        fecha_vencimiento: { gte: hoy, lte: limitePorVencer },
      };
    }
    return {
      estado: 'activo',
      OR: [
        { fecha_vencimiento: null },
        { fecha_vencimiento: { gt: limitePorVencer } },
      ],
    };
  }

  async findById(id: number): Promise<LoteProductoTerminadoEntity | null> {
    const lote = await this.prisma.loteProductoTerminado.findUnique({
      where: { id },
      include: INCLUDE_CATALOGO,
    });
    return lote ? LoteProductoTerminadoMapper.toDomain(lote) : null;
  }

  async findMany(
    params: ListLoteProductoTerminadoParams,
  ): Promise<PaginatedResult<LoteProductoTerminadoEntity>> {
    const where: Prisma.LoteProductoTerminadoWhereInput = {
      ...(params.activo === undefined ? {} : { activo: params.activo }),
      ...(params.producto_terminado_id === undefined
        ? {}
        : { producto_terminado_id: params.producto_terminado_id }),
      AND: [
        ...(params.search
          ? [
              {
                OR: [
                  {
                    codigo_lote: {
                      contains: params.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    producto_terminado: {
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
                    },
                  },
                ],
              } satisfies Prisma.LoteProductoTerminadoWhereInput,
            ]
          : []),
        ...(params.estado ? [this.estadoCondition(params.estado)] : []),
        ...(params.vence_desde || params.vence_hasta
          ? [
              {
                fecha_vencimiento: {
                  ...(params.vence_desde ? { gte: params.vence_desde } : {}),
                  ...(params.vence_hasta ? { lte: params.vence_hasta } : {}),
                },
              } satisfies Prisma.LoteProductoTerminadoWhereInput,
            ]
          : []),
      ],
    };

    const [lotes, total] = await this.prisma.$transaction([
      this.prisma.loteProductoTerminado.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { fecha_vencimiento: { sort: 'asc', nulls: 'last' } },
        include: INCLUDE_CATALOGO,
      }),
      this.prisma.loteProductoTerminado.count({ where }),
    ]);

    return {
      data: lotes.map((lote) => LoteProductoTerminadoMapper.toDomain(lote)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async findDisponiblesParaSalida(
    producto_terminado_id: number,
  ): Promise<LoteProductoTerminadoEntity[]> {
    const lotes = await this.prisma.loteProductoTerminado.findMany({
      where: {
        producto_terminado_id,
        estado: 'activo',
        activo: true,
        cantidad_actual: { gt: 0 },
        // Igual que insumos: nunca repartir un lote ya vencido, aunque la
        // columna siga en 'activo'.
        OR: [
          { fecha_vencimiento: null },
          { fecha_vencimiento: { gte: new Date() } },
        ],
      },
      orderBy: [
        { fecha_vencimiento: { sort: 'asc', nulls: 'last' } },
        { id: 'asc' },
      ],
      include: INCLUDE_CATALOGO,
    });

    return lotes.map((lote) => LoteProductoTerminadoMapper.toDomain(lote));
  }
}
