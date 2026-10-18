import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { IniciativaRepository } from '../../domain/repositories/iniciativa.repository';
import {
  CreateIniciativaParams,
  IniciativaEntityEnriquecido,
  ListIniciativasPorObjetivoParams,
  UpdateIniciativaParams,
} from '../../domain/repositories/types/iniciativa-repository.types';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import { IniciativaMapper } from '../mappers/iniciativa.mapper';

const INICIATIVA_INCLUDE_ENRIQUECIDA = {
  estado_iniciativa: true,
  objetivo_estrategico: {
    select: {
      id: true,
      nombre: true,
      responsable: true,
      perspectiva_bsc: { select: { id: true, nombre: true } },
    },
  },
} satisfies Prisma.IniciativaInclude;

@Injectable()
export class PrismaIniciativaRepository implements IniciativaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<IniciativaEntityEnriquecido | null> {
    const iniciativa = await this.prisma.iniciativa.findUnique({
      where: { id },
      include: INICIATIVA_INCLUDE_ENRIQUECIDA,
    });

    return iniciativa ? IniciativaMapper.toDomain(iniciativa) : null;
  }

  async create(
    params: CreateIniciativaParams,
    codigoPlan: string,
    correlativo: string,
  ): Promise<IniciativaEntityEnriquecido> {
    return this.prisma.$transaction(async (tx) => {
      const codigo = `${codigoPlan}-INI-N-${correlativo}`;
      const iniciativa = await tx.iniciativa.create({
        data: {
          ...params,
          codigo,
          estado_iniciativa_id: 1,
        },
      });
      const conRelaciones = await tx.iniciativa.findUniqueOrThrow({
        where: { id: iniciativa.id },
        include: INICIATIVA_INCLUDE_ENRIQUECIDA,
      });

      return IniciativaMapper.toDomain(conRelaciones);
    });
  }

  async existsByNombre(
    objetivoEstrategicoId: number,
    nombre: string,
    excludeId?: number,
  ): Promise<boolean> {
    const iniciativa = await this.prisma.iniciativa.findFirst({
      where: {
        objetivo_estrategico_id: objetivoEstrategicoId,
        nombre: { equals: nombre, mode: 'insensitive' },
        estado: true,
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });

    return iniciativa !== null;
  }

  async update(
    id: number,
    params: UpdateIniciativaParams,
  ): Promise<IniciativaEntityEnriquecido> {
    const iniciativa = await this.prisma.iniciativa.update({
      where: { id },
      data: params,
      include: INICIATIVA_INCLUDE_ENRIQUECIDA,
    });

    return IniciativaMapper.toDomain(iniciativa);
  }

  async setEstado(
    id: number,
    estado: boolean,
  ): Promise<IniciativaEntityEnriquecido> {
    const iniciativa = await this.prisma.iniciativa.update({
      where: { id },
      data: { estado },
      include: INICIATIVA_INCLUDE_ENRIQUECIDA,
    });

    return IniciativaMapper.toDomain(iniciativa);
  }

  async updateEstadoIniciativa(
    id: number,
    estadoIniciativaId: number,
    motivoCancelacion?: string,
  ): Promise<IniciativaEntityEnriquecido> {
    const iniciativa = await this.prisma.iniciativa.update({
      where: { id },
      data: {
        estado_iniciativa_id: estadoIniciativaId,
        ...(motivoCancelacion === undefined
          ? {}
          : { motivo_cancelacion: motivoCancelacion }),
      },
      include: INICIATIVA_INCLUDE_ENRIQUECIDA,
    });

    return IniciativaMapper.toDomain(iniciativa);
  }

  async countByPlanYTipo(
    planId: number,
    tipoModuloId: number,
  ): Promise<number> {
    return this.prisma.iniciativa.count({
      where: {
        estado: true,
        objetivo_estrategico: {
          plan_estrategico_id: planId,
          tipo_modulo_id: tipoModuloId,
        },
      },
    });
  }

  async findByObjetivo(
    params: ListIniciativasPorObjetivoParams,
  ): Promise<PaginatedResult<IniciativaEntityEnriquecido>> {
    const where: Prisma.IniciativaWhereInput = {
      objetivo_estrategico_id: params.objetivo_estrategico_id,
      estado: true,
      ...(params.search
        ? { nombre: { contains: params.search, mode: 'insensitive' } }
        : {}),
    };
    const [iniciativas, total] = await this.prisma.$transaction([
      this.prisma.iniciativa.findMany({
        where,
        include: INICIATIVA_INCLUDE_ENRIQUECIDA,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { codigo: 'asc' },
      }),
      this.prisma.iniciativa.count({ where }),
    ]);

    return {
      data: iniciativas.map((iniciativa) =>
        IniciativaMapper.toDomain(iniciativa),
      ),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async findResumenPorPlan(
    planId: number,
    tipoModuloId: number,
  ): Promise<IniciativaEntityEnriquecido[]> {
    const iniciativas = await this.prisma.iniciativa.findMany({
      where: {
        estado: true,
        objetivo_estrategico: {
          plan_estrategico_id: planId,
          tipo_modulo_id: tipoModuloId,
          estado: true,
        },
      },
      include: INICIATIVA_INCLUDE_ENRIQUECIDA,
      orderBy: { codigo: 'asc' },
    });

    return iniciativas.map((iniciativa) =>
      IniciativaMapper.toDomain(iniciativa),
    );
  }
}
