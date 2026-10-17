import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PeriodoEntity } from '../../domain/entities';
import { PeriodoRepository } from '../../domain/repositories/periodo.repository';
import { PeriodoMapper } from '../mappers/periodo.mapper';

@Injectable()
export class PrismaPeriodoRepository implements PeriodoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<PeriodoEntity | null> {
    const periodo = await this.prisma.periodo.findUnique({ where: { id } });
    return periodo ? PeriodoMapper.toDomain(periodo) : null;
  }

  async findByFrecuencia(frecuencia_id: number): Promise<PeriodoEntity[]> {
    const periodos = await this.prisma.periodo.findMany({
      where: { frecuencia_id, estado: true },
      orderBy: { numero: 'asc' },
    });

    return periodos.map((periodo) => PeriodoMapper.toDomain(periodo));
  }
}
