import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { SolicitudProduccionEntity } from '../../domain/entities';
import { EstadoSolicitudProduccion } from '../../domain/enums';
import { SolicitudProduccionRepository } from '../../domain/repositories/solicitud-produccion.repository';
import {
  CreateSolicitudProduccionParams,
  IndicadoresSolicitudProduccion,
  ListSolicitudProduccionParams,
} from '../../domain/repositories/types/solicitud-produccion-repository.types';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';
import { SolicitudProduccionMapper } from '../mappers/solicitud-produccion.mapper';

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
} satisfies Prisma.SolicitudProduccionInclude;

@Injectable()
export class PrismaSolicitudProduccionRepository implements SolicitudProduccionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    params: CreateSolicitudProduccionParams,
  ): Promise<SolicitudProduccionEntity> {
    const { detalle, ...cabecera } = params;

    const solicitud = await this.prisma.$transaction(async (tx) => {
      const creada = await tx.solicitudProduccion.create({
        data: cabecera,
      });

      await tx.solicitudProduccionDetalle.createMany({
        data: detalle.map((linea) => ({
          solicitud_produccion_id: creada.id,
          producto_terminado_id: linea.producto_terminado_id,
          cantidad_solicitada: linea.cantidad_solicitada,
        })),
      });

      return tx.solicitudProduccion.findUniqueOrThrow({
        where: { id: creada.id },
        include: INCLUDE_SOLICITANTE,
      });
    });

    return SolicitudProduccionMapper.toDomain(solicitud);
  }

  async findById(id: number): Promise<SolicitudProduccionEntity | null> {
    const solicitud = await this.prisma.solicitudProduccion.findUnique({
      where: { id },
      include: INCLUDE_SOLICITANTE,
    });
    return solicitud ? SolicitudProduccionMapper.toDomain(solicitud) : null;
  }

  async findMany(
    params: ListSolicitudProduccionParams,
  ): Promise<PaginatedResult<SolicitudProduccionEntity>> {
    const where: Prisma.SolicitudProduccionWhereInput = {
      ...(params.estado ? { estado: params.estado } : {}),
      ...(params.solicitado_por
        ? { solicitado_por: params.solicitado_por }
        : {}),
      ...(params.fecha_desde || params.fecha_hasta
        ? {
            fecha_creacion: {
              ...(params.fecha_desde ? { gte: params.fecha_desde } : {}),
              ...(params.fecha_hasta ? { lte: params.fecha_hasta } : {}),
            },
          }
        : {}),
      ...(params.search
        ? {
            OR: [
              { codigo: { contains: params.search, mode: 'insensitive' } },
              {
                detalle: {
                  some: {
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
                },
              },
            ],
          }
        : {}),
    };

    const [solicitudes, total] = await this.prisma.$transaction([
      this.prisma.solicitudProduccion.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { created_at: 'desc' },
        include: INCLUDE_SOLICITANTE,
      }),
      this.prisma.solicitudProduccion.count({ where }),
    ]);

    return {
      data: solicitudes.map((solicitud) =>
        SolicitudProduccionMapper.toDomain(solicitud),
      ),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async existsByCodigo(codigo: string): Promise<boolean> {
    const existe = await this.prisma.solicitudProduccion.findUnique({
      where: { codigo },
      select: { id: true },
    });
    return existe !== null;
  }

  async updateEstado(
    id: number,
    estado: EstadoSolicitudProduccion,
  ): Promise<SolicitudProduccionEntity> {
    const solicitud = await this.prisma.solicitudProduccion.update({
      where: { id },
      data: { estado },
      include: INCLUDE_SOLICITANTE,
    });
    return SolicitudProduccionMapper.toDomain(solicitud);
  }

  async updateFechaLimite(
    id: number,
    fecha_limite: Date,
  ): Promise<SolicitudProduccionEntity> {
    const solicitud = await this.prisma.solicitudProduccion.update({
      where: { id },
      data: { fecha_limite },
      include: INCLUDE_SOLICITANTE,
    });
    return SolicitudProduccionMapper.toDomain(solicitud);
  }

  async getIndicadores(): Promise<IndicadoresSolicitudProduccion> {
    const conteos = await this.prisma.solicitudProduccion.groupBy({
      by: ['estado'],
      _count: { _all: true },
    });

    const porEstado: Record<EstadoSolicitudProduccion, number> = {
      [EstadoSolicitudProduccion.PENDIENTE]: 0,
      [EstadoSolicitudProduccion.EN_PROCESO]: 0,
      [EstadoSolicitudProduccion.ENTREGADO]: 0,
      [EstadoSolicitudProduccion.RECHAZADO]: 0,
    };

    for (const fila of conteos) {
      porEstado[fila.estado as EstadoSolicitudProduccion] = fila._count._all;
    }

    const total = Object.values(porEstado).reduce((suma, n) => suma + n, 0);

    return {
      pendiente: porEstado[EstadoSolicitudProduccion.PENDIENTE],
      en_proceso: porEstado[EstadoSolicitudProduccion.EN_PROCESO],
      entregado: porEstado[EstadoSolicitudProduccion.ENTREGADO],
      rechazado: porEstado[EstadoSolicitudProduccion.RECHAZADO],
      total,
    };
  }
}
