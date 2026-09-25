import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { EstadoPlanEstrategicoEntity } from '../../domain/entities';
import { EstadoPlanEstrategicoRepository } from '../../domain/repositories/estado-plan-estrategico.repository';
import { EstadoPlanEstrategicoMapper } from '../mappers/estado-plan-estrategico.mapper';

@Injectable()
export class PrismaEstadoPlanEstrategicoRepository implements EstadoPlanEstrategicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCodigo(
    codigo: string,
  ): Promise<EstadoPlanEstrategicoEntity | null> {
    const estadoPlan = await this.prisma.estadoPlanEstrategico.findUnique({
      where: { codigo },
    });

    return estadoPlan ? EstadoPlanEstrategicoMapper.toDomain(estadoPlan) : null;
  }

  async findById(id: number): Promise<EstadoPlanEstrategicoEntity | null> {
    const estadoPlan = await this.prisma.estadoPlanEstrategico.findUnique({
      where: { id },
    });

    return estadoPlan ? EstadoPlanEstrategicoMapper.toDomain(estadoPlan) : null;
  }
}
