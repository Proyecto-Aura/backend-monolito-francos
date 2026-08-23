import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { EmpleadoEntity } from '../../domain/entities/empleado.entity';
import { EmpleadoRepository } from '../../domain/repositories/empleado.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CreateEmpleadoParams,
  ListEmpleadosParams,
  UpdateEmpleadoParams,
} from '../../domain/repositories/types/empleado-repository.types';
import { EmpleadoMapper } from '../mappers/empleado.mapper';

@Injectable()
export class PrismaEmpleadoRepository implements EmpleadoRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(params: CreateEmpleadoParams): Promise<EmpleadoEntity> {
    return EmpleadoMapper.toDomain(
      await this.prisma.empleado.create({ data: params }),
    );
  }
  async findById(id: string): Promise<EmpleadoEntity | null> {
    const empleado = await this.prisma.empleado.findUnique({ where: { id } });
    return empleado ? EmpleadoMapper.toDomain(empleado) : null;
  }
  async findMany(
    params: ListEmpleadosParams,
  ): Promise<PaginatedResult<EmpleadoEntity>> {
    const where: Prisma.EmpleadoWhereInput = {
      ...(params.estado === undefined ? {} : { estado: params.estado }),
      ...(params.search
        ? { cargo: { contains: params.search, mode: 'insensitive' } }
        : {}),
    };
    const [empleados, total] = await this.prisma.$transaction([
      this.prisma.empleado.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.empleado.count({ where }),
    ]);
    return {
      data: empleados.map((empleado) => EmpleadoMapper.toDomain(empleado)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }
  async existsByPersonaId(
    personaId: string,
    excludeId?: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.empleado.findFirst({
        where: {
          persona_id: personaId,
          ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
        },
        select: { id: true },
      })) !== null
    );
  }
  async update(
    id: string,
    params: UpdateEmpleadoParams,
  ): Promise<EmpleadoEntity> {
    return EmpleadoMapper.toDomain(
      await this.prisma.empleado.update({ where: { id }, data: params }),
    );
  }
  async setStatus(id: string, estado: boolean): Promise<EmpleadoEntity> {
    return EmpleadoMapper.toDomain(
      await this.prisma.empleado.update({ where: { id }, data: { estado } }),
    );
  }
}
