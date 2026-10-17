import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  complementoOperador,
  KPI_SEMAFORO_COLORES,
} from '../../application/use-cases/kpi/kpi-semaforo.utils';
import { KpiRepository } from '../../domain/repositories/kpi.repository';
import {
  CreateKpiParams,
  KpiEntityEnriquecido,
  KpiResumenPlanEntidad,
  ListKpisPorObjetivoParams,
} from '../../domain/repositories/types/kpi-repository.types';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import { KpiValorMapper } from '../mappers/kpi-valor.mapper';
import { KpiMapper } from '../mappers/kpi.mapper';

const KPI_INCLUDE_ENRIQUECIDO = {
  frecuencia: true,
  unidad_medida: true,
  metas_anuales: true,
  semaforos: true,
  objetivo_estrategico: {
    select: {
      id: true,
      nombre: true,
      perspectiva_bsc: { select: { id: true, nombre: true } },
    },
  },
} satisfies Prisma.KpiInclude;

const KPI_INCLUDE_RESUMEN_PLAN = {
  frecuencia: true,
  unidad_medida: true,
  metas_anuales: true,
  semaforos: true,
  objetivo_estrategico: {
    select: {
      id: true,
      nombre: true,
      responsable: true,
      perspectiva_bsc: { select: { id: true, nombre: true } },
    },
  },
} satisfies Prisma.KpiInclude;

@Injectable()
export class PrismaKpiRepository implements KpiRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<KpiEntityEnriquecido | null> {
    const kpi = await this.prisma.kpi.findUnique({
      where: { id },
      include: KPI_INCLUDE_ENRIQUECIDO,
    });

    return kpi ? KpiMapper.toDomain(kpi) : null;
  }

  async create(
    params: CreateKpiParams,
    codigoPlan: string,
    correlativo: string,
  ): Promise<KpiEntityEnriquecido> {
    return this.prisma.$transaction(async (tx) => {
      const codigo = `${codigoPlan}-KPI-N-${correlativo}`;

      const kpi = await tx.kpi.create({
        data: {
          codigo,
          objetivo_estrategico_id: params.objetivo_estrategico_id,
          frecuencia_id: params.frecuencia_id,
          unidad_medida_id: params.unidad_medida_id,
          nombre: params.nombre,
          formula: params.formula,
        },
      });

      for (const fila of params.metas_por_anio) {
        await tx.kpiMetaAnual.create({
          data: { kpi_id: kpi.id, anio: fila.anio, meta: fila.meta },
        });

        await tx.semaforoConfig.createMany({
          data: [
            {
              kpi_id: kpi.id,
              anio: fila.anio,
              color: 'VERDE',
              color_hex: KPI_SEMAFORO_COLORES.VERDE,
              operador: fila.operador_verde,
              valor_referencia: fila.meta,
            },
            {
              kpi_id: kpi.id,
              anio: fila.anio,
              color: 'AMARILLO',
              color_hex: KPI_SEMAFORO_COLORES.AMARILLO,
              operador: fila.operador_amarillo,
              valor_referencia: fila.valor_amarillo,
            },
            {
              kpi_id: kpi.id,
              anio: fila.anio,
              color: 'ROJO',
              color_hex: KPI_SEMAFORO_COLORES.ROJO,
              operador: complementoOperador(fila.operador_amarillo),
              valor_referencia: fila.valor_amarillo,
            },
          ],
        });
      }

      const conRelaciones = await tx.kpi.findUniqueOrThrow({
        where: { id: kpi.id },
        include: KPI_INCLUDE_ENRIQUECIDO,
      });

      return KpiMapper.toDomain(conRelaciones);
    });
  }

  async existsByNombre(
    objetivoEstrategicoId: number,
    nombre: string,
  ): Promise<boolean> {
    const kpi = await this.prisma.kpi.findFirst({
      where: {
        objetivo_estrategico_id: objetivoEstrategicoId,
        nombre: { equals: nombre, mode: 'insensitive' },
        estado: true,
      },
      select: { id: true },
    });

    return kpi !== null;
  }

  async countByPlanYTipo(
    planId: number,
    tipoModuloId: number,
  ): Promise<number> {
    return this.prisma.kpi.count({
      where: {
        objetivo_estrategico: {
          plan_estrategico_id: planId,
          tipo_modulo_id: tipoModuloId,
        },
      },
    });
  }

  async findByObjetivo(
    params: ListKpisPorObjetivoParams,
  ): Promise<PaginatedResult<KpiEntityEnriquecido>> {
    const where: Prisma.KpiWhereInput = {
      objetivo_estrategico_id: params.objetivo_estrategico_id,
      estado: true,
      ...(params.search
        ? { nombre: { contains: params.search, mode: 'insensitive' } }
        : {}),
    };

    const [kpis, total] = await this.prisma.$transaction([
      this.prisma.kpi.findMany({
        where,
        include: KPI_INCLUDE_ENRIQUECIDO,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { codigo: 'asc' },
      }),
      this.prisma.kpi.count({ where }),
    ]);

    return {
      data: kpis.map((kpi) => KpiMapper.toDomain(kpi)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async findResumenPorPlan(
    planId: number,
    tipoModuloId: number,
  ): Promise<KpiResumenPlanEntidad[]> {
    const kpis = await this.prisma.kpi.findMany({
      where: {
        estado: true,
        objetivo_estrategico: {
          plan_estrategico_id: planId,
          tipo_modulo_id: tipoModuloId,
          estado: true,
        },
      },
      include: KPI_INCLUDE_RESUMEN_PLAN,
      orderBy: { codigo: 'asc' },
    });

    if (kpis.length === 0) {
      return [];
    }

    const ultimosValores = await this.prisma.kpiValor.findMany({
      where: { kpi_id: { in: kpis.map((kpi) => kpi.id) }, estado: true },
      include: { periodo: true },
      orderBy: [{ anio: 'desc' }, { periodo: { numero: 'desc' } }],
      distinct: ['kpi_id'],
    });

    const ultimoPorKpi = new Map(
      ultimosValores.map((valor) => [
        valor.kpi_id,
        KpiValorMapper.toDomain(valor),
      ]),
    );

    return kpis.map((kpi) => {
      const entidad = KpiMapper.toDomain(kpi) as KpiResumenPlanEntidad;
      entidad.objetivo_estrategico = {
        ...entidad.objetivo_estrategico,
        responsable: kpi.objetivo_estrategico.responsable,
      };
      entidad.ultimo_valor = ultimoPorKpi.get(kpi.id) ?? null;
      return entidad;
    });
  }
}
