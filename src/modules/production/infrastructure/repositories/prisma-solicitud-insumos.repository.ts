import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { SolicitudInsumosEntity } from '../../domain/entities';
import { EstadoSolicitudInsumos } from '../../domain/enums';
import { SolicitudInsumosRepository } from '../../domain/repositories/solicitud-insumos.repository';
import {
  CreateSolicitudInsumosParams,
  IndicadoresSolicitudInsumos,
  ListSolicitudInsumosParams,
  SolicitudInsumosResumen,
} from '../../domain/repositories/types/solicitud-insumos-repository.types';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';
import { calcularDisponibilidadInsumos } from '../../application/utils/solicitud-insumos.utils';
import { SolicitudInsumosMapper } from '../mappers/solicitud-insumos.mapper';

const INCLUDE_SOLICITANTE = {
  _count: { select: { detalle: true } },
  solicitante: {
    select: {
      persona: {
        select: {
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
        },
      },
    },
  },
} satisfies Prisma.SolicitudInsumosInclude;

@Injectable()
export class PrismaSolicitudInsumosRepository implements SolicitudInsumosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    params: CreateSolicitudInsumosParams,
  ): Promise<SolicitudInsumosEntity> {
    const { detalle, ...cabecera } = params;

    const solicitud = await this.prisma.$transaction(async (tx) => {
      const creada = await tx.solicitudInsumos.create({
        data: cabecera,
      });

      await tx.solicitudInsumosDetalle.createMany({
        data: detalle.map((linea) => ({
          solicitud_insumos_id: creada.id,
          insumo_id: linea.insumo_id,
          cantidad_solicitada: linea.cantidad_solicitada,
        })),
      });

      return tx.solicitudInsumos.findUniqueOrThrow({
        where: { id: creada.id },
        include: INCLUDE_SOLICITANTE,
      });
    });

    return SolicitudInsumosMapper.toDomain(solicitud);
  }

  async findById(id: number): Promise<SolicitudInsumosEntity | null> {
    const solicitud = await this.prisma.solicitudInsumos.findUnique({
      where: { id },
      include: INCLUDE_SOLICITANTE,
    });
    return solicitud ? SolicitudInsumosMapper.toDomain(solicitud) : null;
  }

  async findMany(
    params: ListSolicitudInsumosParams,
  ): Promise<PaginatedResult<SolicitudInsumosResumen>> {
    const where: Prisma.SolicitudInsumosWhereInput = {
      ...(params.estado ? { estado: params.estado } : {}),
      ...(params.solicitado_por
        ? { solicitado_por: params.solicitado_por }
        : {}),
      ...(params.solicitud_produccion_id === undefined
        ? {}
        : { solicitud_produccion_id: params.solicitud_produccion_id }),
      ...(params.fecha_desde || params.fecha_hasta
        ? {
            fecha_creacion: {
              ...(params.fecha_desde ? { gte: params.fecha_desde } : {}),
              ...(params.fecha_hasta ? { lt: params.fecha_hasta } : {}),
            },
          }
        : {}),
      ...(params.search
        ? {
            OR: [
              {
                codigo_solicitud: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
              {
                detalle: {
                  some: {
                    insumo: {
                      OR: [
                        {
                          sku: {
                            contains: params.search,
                            mode: 'insensitive',
                          },
                        },
                        {
                          nombre: {
                            contains: params.search,
                            mode: 'insensitive',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [solicitudes, total] = await this.prisma.$transaction([
      this.prisma.solicitudInsumos.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        // Primero por estado -- Postgres ordena un enum por el orden en que
        // se declaró el tipo, así que `estado: 'asc'` ya deja pendiente,
        // luego en_proceso, luego entregado, luego rechazado (ver
        // EstadoSolicitudInsumos en schema.prisma) -- y dentro de cada
        // estado, las más recientes primero.
        orderBy: [{ estado: 'asc' }, { created_at: 'desc' }],
        include: {
          ...INCLUDE_SOLICITANTE,
          // Solo se usa cuando conDisponibilidad=true (vista de inventario),
          // pero el join es barato (FK indexada) así que se pide siempre
          // para no complicar el tipo del select con un condicional en
          // tiempo de ejecución (mismo criterio que PrismaPedidoRepository).
          detalle: {
            select: {
              cantidad_solicitada: true,
              insumo: { select: { stock_actual: true } },
            },
          },
        },
      }),
      this.prisma.solicitudInsumos.count({ where }),
    ]);

    return {
      data: solicitudes.map((solicitud) => ({
        solicitud: SolicitudInsumosMapper.toDomain(solicitud),
        ...(params.conDisponibilidad
          ? {
              disponibilidad: calcularDisponibilidadInsumos(
                solicitud.detalle.map((linea) => ({
                  cantidad_solicitada: linea.cantidad_solicitada.toNumber(),
                  stock_disponible: linea.insumo.stock_actual.toNumber(),
                })),
              ),
            }
          : {}),
      })),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async existsByCodigo(codigo_solicitud: string): Promise<boolean> {
    const existe = await this.prisma.solicitudInsumos.findUnique({
      where: { codigo_solicitud },
      select: { id: true },
    });
    return existe !== null;
  }

  async updateEstado(
    id: number,
    estado: EstadoSolicitudInsumos,
  ): Promise<SolicitudInsumosEntity> {
    const solicitud = await this.prisma.solicitudInsumos.update({
      where: { id },
      data: { estado },
      include: INCLUDE_SOLICITANTE,
    });
    return SolicitudInsumosMapper.toDomain(solicitud);
  }

  async updateFechaLimite(
    id: number,
    fecha_limite: Date,
  ): Promise<SolicitudInsumosEntity> {
    const solicitud = await this.prisma.solicitudInsumos.update({
      where: { id },
      data: { fecha_limite },
      include: INCLUDE_SOLICITANTE,
    });
    return SolicitudInsumosMapper.toDomain(solicitud);
  }

  async getIndicadores(): Promise<IndicadoresSolicitudInsumos> {
    const conteos = await this.prisma.solicitudInsumos.groupBy({
      by: ['estado'],
      _count: { _all: true },
    });

    const porEstado: Record<EstadoSolicitudInsumos, number> = {
      [EstadoSolicitudInsumos.PENDIENTE]: 0,
      [EstadoSolicitudInsumos.EN_PROCESO]: 0,
      [EstadoSolicitudInsumos.ENTREGADO]: 0,
      [EstadoSolicitudInsumos.RECHAZADO]: 0,
    };

    for (const fila of conteos) {
      porEstado[fila.estado as EstadoSolicitudInsumos] = fila._count._all;
    }

    const total = Object.values(porEstado).reduce((suma, n) => suma + n, 0);

    return {
      pendiente: porEstado[EstadoSolicitudInsumos.PENDIENTE],
      en_proceso: porEstado[EstadoSolicitudInsumos.EN_PROCESO],
      entregado: porEstado[EstadoSolicitudInsumos.ENTREGADO],
      rechazado: porEstado[EstadoSolicitudInsumos.RECHAZADO],
      total,
    };
  }
}
