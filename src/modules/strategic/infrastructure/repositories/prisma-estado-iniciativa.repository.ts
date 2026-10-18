import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { EstadoIniciativaEntity } from '../../domain/entities';
import { EstadoIniciativaRepository } from '../../domain/repositories/estado-iniciativa.repository';
import { EstadoIniciativaMapper } from '../mappers/estado-iniciativa.mapper';

@Injectable()
export class PrismaEstadoIniciativaRepository implements EstadoIniciativaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCodigo(codigo: string): Promise<EstadoIniciativaEntity | null> {
    const estadoIniciativa = await this.prisma.estadoIniciativa.findUnique({
      where: { codigo },
    });

    return estadoIniciativa
      ? EstadoIniciativaMapper.toDomain(estadoIniciativa)
      : null;
  }
}
