import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { AccesoEntity } from '../../domain/entities/acceso.entity';
import { AccesoRepository } from '../../domain/repositories/acceso.repository';
import { CreateAccesoParams } from '../../domain/repositories/types/acceso-repository.types';
import { AccesoMapper } from '../mappers/acceso.mapper';

@Injectable()
export class PrismaAccesoRepository implements AccesoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateAccesoParams): Promise<AccesoEntity> {
    const acceso = await this.prisma.acceso.create({ data: params });
    return AccesoMapper.toDomain(acceso);
  }

  async findByRoleAndRoute(
    rolId: number,
    rutaId: number,
  ): Promise<AccesoEntity | null> {
    const acceso = await this.prisma.acceso.findUnique({
      where: {
        rol_id_ruta_id: {
          rol_id: rolId,
          ruta_id: rutaId,
        },
      },
    });

    return acceso ? AccesoMapper.toDomain(acceso) : null;
  }

  async findByRoleId(rolId: number): Promise<AccesoEntity[]> {
    const accesos = await this.prisma.acceso.findMany({
      where: { rol_id: rolId },
      orderBy: { ruta_id: 'asc' },
    });

    return accesos.map((acceso) => AccesoMapper.toDomain(acceso));
  }

  async findByRouteId(rutaId: number): Promise<AccesoEntity[]> {
    const accesos = await this.prisma.acceso.findMany({
      where: { ruta_id: rutaId },
      orderBy: { rol_id: 'asc' },
    });

    return accesos.map((acceso) => AccesoMapper.toDomain(acceso));
  }

  async setStatus(id: number, estado: boolean): Promise<AccesoEntity> {
    const acceso = await this.prisma.acceso.update({
      where: { id },
      data: { estado },
    });

    return AccesoMapper.toDomain(acceso);
  }
}
