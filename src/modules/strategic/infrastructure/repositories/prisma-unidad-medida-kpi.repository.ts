import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { UnidadMedidaKpiEntity } from '../../domain/entities';
import { UnidadMedidaKpiRepository } from '../../domain/repositories/unidad-medida-kpi.repository';
import { UnidadMedidaKpiMapper } from '../mappers/unidad-medida-kpi.mapper';

@Injectable()
export class PrismaUnidadMedidaKpiRepository implements UnidadMedidaKpiRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<UnidadMedidaKpiEntity | null> {
    const unidad = await this.prisma.unidadMedidaKpi.findUnique({
      where: { id },
    });

    return unidad ? UnidadMedidaKpiMapper.toDomain(unidad) : null;
  }
}
