import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PlanEstrategicoRepository } from '../../domain/repositories/plan-estrategico.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CreatePlanEstrategicoParams,
  ListPlanesEstrategicosParams,
  PlanEstrategicoEntityConEstado,
  UpdatePlanEstrategicoParams,
} from '../../domain/repositories/types/plan-estrategico-repository.types';
import { PlanEstrategicoMapper } from '../mappers/plan-estrategico.mapper';

@Injectable()
export class PrismaPlanEstrategicoRepository implements PlanEstrategicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    params: CreatePlanEstrategicoParams,
  ): Promise<PlanEstrategicoEntityConEstado> {
    return this.prisma.$transaction(async (tx) => {
      const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval(pg_get_serial_sequence('strategic.plan_estrategico', 'id')) AS nextval
      `;
      const id = Number(nextval);
      const codigo = `PE-${String(id).padStart(4, '0')}`;

      const created = await tx.planEstrategico.create({
        data: { id, codigo, ...params, estado_plan_id: 1 },
        include: { estado_plan: true },
      });

      return PlanEstrategicoMapper.toDomain(created);
    });
  }

  // Las historias de objetivos, KPIs e iniciativas consultarán este estado.
  async findById(id: number): Promise<PlanEstrategicoEntityConEstado | null> {
    const plan = await this.prisma.planEstrategico.findUnique({
      where: { id },
      include: { estado_plan: true },
    });

    return plan ? PlanEstrategicoMapper.toDomain(plan) : null;
  }

  async findActivoById(
    id: number,
  ): Promise<PlanEstrategicoEntityConEstado | null> {
    const plan = await this.prisma.planEstrategico.findFirst({
      where: { id, estado: true },
      include: { estado_plan: true },
    });

    return plan ? PlanEstrategicoMapper.toDomain(plan) : null;
  }

  private async buscar(
    params: ListPlanesEstrategicosParams,
    soloActivos: boolean,
  ): Promise<PaginatedResult<PlanEstrategicoEntityConEstado>> {
    const where: Prisma.PlanEstrategicoWhereInput = {
      ...(soloActivos ? { estado: true } : {}),
      ...(params.search
        ? { nombre: { contains: params.search, mode: 'insensitive' } }
        : {}),
      ...(params.estado_codigo
        ? { estado_plan: { codigo: params.estado_codigo } }
        : {}),
    };

    const [planes, total] = await this.prisma.$transaction([
      this.prisma.planEstrategico.findMany({
        where,
        include: { estado_plan: true },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: [{ estado_plan: { orden: 'asc' } }, { nombre: 'asc' }],
      }),
      this.prisma.planEstrategico.count({ where }),
    ]);

    return {
      data: planes.map((plan) => PlanEstrategicoMapper.toDomain(plan)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async findMany(
    params: ListPlanesEstrategicosParams,
  ): Promise<PaginatedResult<PlanEstrategicoEntityConEstado>> {
    return this.buscar(params, true);
  }

  async findManyIncluyendoInactivos(
    params: ListPlanesEstrategicosParams,
  ): Promise<PaginatedResult<PlanEstrategicoEntityConEstado>> {
    return this.buscar(params, false);
  }

  async existsByName(nombre: string, excludeId?: number): Promise<boolean> {
    const plan = await this.prisma.planEstrategico.findFirst({
      where: {
        nombre: { equals: nombre, mode: 'insensitive' },
        estado: true,
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });

    return plan !== null;
  }

  async update(
    id: number,
    params: UpdatePlanEstrategicoParams,
  ): Promise<PlanEstrategicoEntityConEstado> {
    const plan = await this.prisma.planEstrategico.update({
      where: { id },
      data: params,
      include: { estado_plan: true },
    });

    return PlanEstrategicoMapper.toDomain(plan);
  }

  async setEstado(
    id: number,
    estado: boolean,
  ): Promise<PlanEstrategicoEntityConEstado> {
    const plan = await this.prisma.planEstrategico.update({
      where: { id },
      data: { estado },
      include: { estado_plan: true },
    });

    return PlanEstrategicoMapper.toDomain(plan);
  }

  async updateEstado(
    id: number,
    nuevoEstadoPlanId: number,
  ): Promise<PlanEstrategicoEntityConEstado> {
    const plan = await this.prisma.planEstrategico.update({
      where: { id },
      data: { estado_plan_id: nuevoEstadoPlanId },
      include: { estado_plan: true },
    });

    return PlanEstrategicoMapper.toDomain(plan);
  }
}
