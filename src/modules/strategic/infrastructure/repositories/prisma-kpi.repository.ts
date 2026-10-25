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
  KpiSeguimientoEntidad,
  ListKpisPorObjetivoParams,
  SemaforoAnualInput,
  UpdateKpiParams,
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
      codigo: true,
      nombre: true,
      responsable: true,
      tipo_modulo_id: true,
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
      codigo: true,
      nombre: true,
      responsable: true,
      tipo_modulo_id: true,
      perspectiva_bsc: { select: { id: true, nombre: true } },
    },
  },
} satisfies Prisma.KpiInclude;

@Injectable()
export class PrismaKpiRepository implements KpiRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async crearMetasYSemaforos(
    tx: Prisma.TransactionClient,
    kpiId: number,
    metasPorAnio: SemaforoAnualInput[],
  ) {
    for (const fila of metasPorAnio) {
      await tx.kpiMetaAnual.create({
        data: { kpi_id: kpiId, anio: fila.anio, meta: fila.meta },
      });

      await tx.semaforoConfig.createMany({
        data: [
          {
            kpi_id: kpiId,
            anio: fila.anio,
            color: 'VERDE',
            color_hex: KPI_SEMAFORO_COLORES.VERDE,
            operador: fila.operador_verde,
            valor_referencia: fila.meta,
          },
          {
            kpi_id: kpiId,
            anio: fila.anio,
            color: 'AMARILLO',
            color_hex: KPI_SEMAFORO_COLORES.AMARILLO,
            operador: fila.operador_amarillo,
            valor_referencia: fila.valor_amarillo,
          },
          {
            kpi_id: kpiId,
            anio: fila.anio,
            color: 'ROJO',
            color_hex: KPI_SEMAFORO_COLORES.ROJO,
            operador: complementoOperador(fila.operador_amarillo),
            valor_referencia: fila.valor_amarillo,
          },
        ],
      });
    }
  }

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
    codigoInfijo: string,
  ): Promise<KpiEntityEnriquecido> {
    return this.prisma.$transaction(async (tx) => {
      const codigo = `${codigoPlan}-KPI-${codigoInfijo}-${correlativo}`;

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

      await this.crearMetasYSemaforos(tx, kpi.id, params.metas_por_anio);

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
    excludeId?: number,
  ): Promise<boolean> {
    const kpi = await this.prisma.kpi.findFirst({
      where: {
        objetivo_estrategico_id: objetivoEstrategicoId,
        nombre: { equals: nombre, mode: 'insensitive' },
        estado: true,
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });

    return kpi !== null;
  }

  async update(
    id: number,
    params: UpdateKpiParams,
  ): Promise<KpiEntityEnriquecido> {
    return this.prisma.$transaction(async (tx) => {
      const { metas_por_anio, ...data } = params;

      await tx.kpi.update({ where: { id }, data });

      if (metas_por_anio !== undefined) {
        const existentes = await tx.kpiMetaAnual.findMany({
          where: { kpi_id: id, estado: true },
          select: { anio: true },
        });
        const aniosExistentes = new Set(existentes.map((meta) => meta.anio));

        const filasNuevas = metas_por_anio.filter(
          (fila) => !aniosExistentes.has(fila.anio),
        );

        if (filasNuevas.length > 0) {
          await this.crearMetasYSemaforos(tx, id, filasNuevas);
        }

        for (const fila of metas_por_anio) {
          if (!aniosExistentes.has(fila.anio)) {
            continue;
          }

          await tx.kpiMetaAnual.updateMany({
            where: { kpi_id: id, anio: fila.anio, estado: true },
            data: { meta: fila.meta },
          });

          await tx.semaforoConfig.updateMany({
            where: {
              kpi_id: id,
              anio: fila.anio,
              color: 'VERDE',
              estado: true,
            },
            data: {
              operador: fila.operador_verde,
              valor_referencia: fila.meta,
            },
          });

          await tx.semaforoConfig.updateMany({
            where: {
              kpi_id: id,
              anio: fila.anio,
              color: 'AMARILLO',
              estado: true,
            },
            data: {
              operador: fila.operador_amarillo,
              valor_referencia: fila.valor_amarillo,
            },
          });

          await tx.semaforoConfig.updateMany({
            where: {
              kpi_id: id,
              anio: fila.anio,
              color: 'ROJO',
              estado: true,
            },
            data: {
              operador: complementoOperador(fila.operador_amarillo),
              valor_referencia: fila.valor_amarillo,
            },
          });
        }
      }

      const actualizado = await tx.kpi.findUniqueOrThrow({
        where: { id },
        include: KPI_INCLUDE_ENRIQUECIDO,
      });

      return KpiMapper.toDomain(actualizado);
    });
  }

  async setEstado(id: number, estado: boolean): Promise<KpiEntityEnriquecido> {
    const kpi = await this.prisma.kpi.update({
      where: { id },
      data: { estado },
      include: KPI_INCLUDE_ENRIQUECIDO,
    });

    return KpiMapper.toDomain(kpi);
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

  async findParaTableroControl(
    planId: number,
    tipoModuloId: number,
  ): Promise<KpiEntityEnriquecido[]> {
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

    const valoresPorAnio = await this.prisma.kpiValor.findMany({
      where: { kpi_id: { in: kpis.map((kpi) => kpi.id) }, estado: true },
      include: { periodo: true },
      orderBy: [
        { kpi_id: 'asc' },
        { anio: 'asc' },
        { periodo: { numero: 'desc' } },
      ],
      distinct: ['kpi_id', 'anio'],
    });

    return kpis.map((kpi) => {
      const entidad = KpiMapper.toDomain(kpi);
      entidad.valores_anuales = valoresPorAnio
        .filter((valor) => valor.kpi_id === kpi.id)
        .map((valor) => KpiValorMapper.toDomain(valor));
      return entidad;
    });
  }

  async findSeguimientoPorPlan(
    planId: number,
    tipoModuloId: number,
  ): Promise<KpiSeguimientoEntidad[]> {
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

    const historial = await this.prisma.kpiValor.findMany({
      where: { kpi_id: { in: kpis.map((kpi) => kpi.id) }, estado: true },
      include: { periodo: true },
      orderBy: [
        { kpi_id: 'asc' },
        { anio: 'asc' },
        { periodo: { numero: 'asc' } },
      ],
    });

    return kpis.map((kpi) => {
      const entidad = KpiMapper.toDomain(kpi) as KpiSeguimientoEntidad;
      entidad.objetivo_estrategico = {
        ...entidad.objetivo_estrategico,
        responsable: kpi.objetivo_estrategico.responsable,
      };

      const historialDelKpi = historial
        .filter((valor) => valor.kpi_id === kpi.id)
        .map((valor) => KpiValorMapper.toDomain(valor));

      entidad.historial = historialDelKpi;
      entidad.ultimo_valor =
        historialDelKpi.length > 0
          ? historialDelKpi[historialDelKpi.length - 1]
          : null;

      return entidad;
    });
  }

  async existeKpiIncompletoEnPlan(
    planId: number,
    anioInicio: number,
    anioFin: number,
  ): Promise<boolean> {
    const kpis = await this.prisma.kpi.findMany({
      where: {
        estado: true,
        objetivo_estrategico: { plan_estrategico_id: planId, estado: true },
      },
      select: {
        id: true,
        metas_anuales: { where: { estado: true }, select: { anio: true } },
        semaforos: {
          where: { estado: true },
          select: { anio: true, color: true },
        },
      },
    });

    const aniosPlan = Array.from(
      { length: anioFin - anioInicio + 1 },
      (_, indice) => anioInicio + indice,
    );

    return kpis.some((kpi) => {
      const aniosConMeta = new Set(kpi.metas_anuales.map((meta) => meta.anio));

      if (!aniosPlan.every((anio) => aniosConMeta.has(anio))) {
        return true;
      }

      const coloresPorAnio = new Map<number, Set<string>>();

      for (const semaforo of kpi.semaforos) {
        const colores = coloresPorAnio.get(semaforo.anio) ?? new Set<string>();
        colores.add(semaforo.color);
        coloresPorAnio.set(semaforo.anio, colores);
      }

      return aniosPlan.some(
        (anio) => (coloresPorAnio.get(anio)?.size ?? 0) < 3,
      );
    });
  }
}
