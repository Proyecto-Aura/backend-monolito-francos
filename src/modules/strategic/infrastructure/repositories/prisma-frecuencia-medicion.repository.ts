import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { FrecuenciaMedicionEntity } from '../../domain/entities';
import { FrecuenciaMedicionRepository } from '../../domain/repositories/frecuencia-medicion.repository';
import { FrecuenciaMedicionMapper } from '../mappers/frecuencia-medicion.mapper';

@Injectable()
export class PrismaFrecuenciaMedicionRepository implements FrecuenciaMedicionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<FrecuenciaMedicionEntity | null> {
    const frecuencia = await this.prisma.frecuenciaMedicion.findUnique({
      where: { id },
    });

    return frecuencia ? FrecuenciaMedicionMapper.toDomain(frecuencia) : null;
  }
}
