import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { KpiValorRepository } from '../../domain/repositories/kpi-valor.repository';
import {
  KpiValorEntityEnriquecido,
  UpsertKpiValorParams,
} from '../../domain/repositories/types/kpi-valor-repository.types';
import { KpiValorMapper } from '../mappers/kpi-valor.mapper';

@Injectable()
export class PrismaKpiValorRepository implements KpiValorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsActivosByKpi(kpiId: number): Promise<boolean> {
    const valor = await this.prisma.kpiValor.findFirst({
      where: { kpi_id: kpiId, estado: true },
      select: { id: true },
    });

    return valor !== null;
  }

  async upsert(
    params: UpsertKpiValorParams,
  ): Promise<KpiValorEntityEnriquecido> {
    return this.prisma.$transaction(async (tx) => {
      const existente = await tx.kpiValor.findFirst({
        where: {
          kpi_id: params.kpi_id,
          anio: params.anio,
          periodo_id: params.periodo_id,
          estado: true,
        },
      });

      const valor = existente
        ? await tx.kpiValor.update({
            where: { id: existente.id },
            data: {
              valor: params.valor,
              semaforo_color: params.semaforo_color,
            },
            include: { periodo: true },
          })
        : await tx.kpiValor.create({
            data: { ...params },
            include: { periodo: true },
          });

      return KpiValorMapper.toDomain(valor);
    });
  }

  async findHistorialByKpi(
    kpiId: number,
  ): Promise<KpiValorEntityEnriquecido[]> {
    const valores = await this.prisma.kpiValor.findMany({
      where: { kpi_id: kpiId, estado: true },
      include: { periodo: true },
      orderBy: [{ anio: 'asc' }, { periodo: { numero: 'asc' } }],
    });

    return valores.map((valor) => KpiValorMapper.toDomain(valor));
  }

  async findUltimoByKpi(
    kpiId: number,
  ): Promise<KpiValorEntityEnriquecido | null> {
    const valor = await this.prisma.kpiValor.findFirst({
      where: { kpi_id: kpiId, estado: true },
      include: { periodo: true },
      orderBy: [{ anio: 'desc' }, { periodo: { numero: 'desc' } }],
    });

    return valor ? KpiValorMapper.toDomain(valor) : null;
  }
}
