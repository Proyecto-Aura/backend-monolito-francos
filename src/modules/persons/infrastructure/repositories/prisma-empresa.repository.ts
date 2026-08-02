import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { EmpresaEntity } from '../../domain/entities/empresa.entity';
import { EmpresaRepository } from '../../domain/repositories/empresa.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CreateEmpresaParams,
  ListEmpresasParams,
  UpdateEmpresaParams,
} from '../../domain/repositories/types/empresa-repository.types';
import { EmpresaMapper } from '../mappers/empresa.mapper';

@Injectable()
export class PrismaEmpresaRepository implements EmpresaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateEmpresaParams): Promise<EmpresaEntity> {
    const empresa = await this.prisma.empresa.create({ data: params });
    return EmpresaMapper.toDomain(empresa);
  }

  async findById(id: number): Promise<EmpresaEntity | null> {
    const empresa = await this.prisma.empresa.findUnique({ where: { id } });
    return empresa ? EmpresaMapper.toDomain(empresa) : null;
  }

  async findMany(
    params: ListEmpresasParams,
  ): Promise<PaginatedResult<EmpresaEntity>> {
    const where: Prisma.EmpresaWhereInput = {
      ...(params.estado === undefined ? {} : { estado: params.estado }),
      ...(params.search
        ? {
            OR: [
              {
                razon_social: { contains: params.search, mode: 'insensitive' },
              },
              { ruc: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [empresas, total] = await this.prisma.$transaction([
      this.prisma.empresa.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { razon_social: 'asc' },
      }),
      this.prisma.empresa.count({ where }),
    ]);

    return {
      data: empresas.map((empresa) => EmpresaMapper.toDomain(empresa)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async existsByRuc(ruc: string, excludeId?: number): Promise<boolean> {
    const empresa = await this.prisma.empresa.findFirst({
      where: {
        ruc,
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    return empresa !== null;
  }

  async existsByEmail(email: string, excludeId?: number): Promise<boolean> {
    const empresa = await this.prisma.empresa.findFirst({
      where: {
        email,
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    return empresa !== null;
  }

  async update(
    id: number,
    params: UpdateEmpresaParams,
  ): Promise<EmpresaEntity> {
    const empresa = await this.prisma.empresa.update({
      where: { id },
      data: params,
    });
    return EmpresaMapper.toDomain(empresa);
  }

  async setStatus(id: number, estado: boolean): Promise<EmpresaEntity> {
    const empresa = await this.prisma.empresa.update({
      where: { id },
      data: { estado },
    });
    return EmpresaMapper.toDomain(empresa);
  }
}
