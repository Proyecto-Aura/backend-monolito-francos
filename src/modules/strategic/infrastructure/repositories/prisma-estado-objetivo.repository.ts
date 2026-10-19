import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { EstadoObjetivoEntity } from '../../domain/entities';
import { EstadoObjetivoRepository } from '../../domain/repositories/estado-objetivo.repository';
import { EstadoObjetivoMapper } from '../mappers/estado-objetivo.mapper';

@Injectable()
export class PrismaEstadoObjetivoRepository implements EstadoObjetivoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCodigo(codigo: string): Promise<EstadoObjetivoEntity | null> {
    const estadoObjetivo = await this.prisma.estadoObjetivo.findUnique({
      where: { codigo },
    });

    return estadoObjetivo
      ? EstadoObjetivoMapper.toDomain(estadoObjetivo)
      : null;
  }

  async findById(id: number): Promise<EstadoObjetivoEntity | null> {
    const estadoObjetivo = await this.prisma.estadoObjetivo.findUnique({
      where: { id },
    });

    return estadoObjetivo
      ? EstadoObjetivoMapper.toDomain(estadoObjetivo)
      : null;
  }
}
