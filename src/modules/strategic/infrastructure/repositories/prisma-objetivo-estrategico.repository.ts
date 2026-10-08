import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ObjetivoEstrategicoRepository } from '../../domain/repositories/objetivo-estrategico.repository';
import {
  CreateObjetivoEstrategicoParams,
  ListObjetivosEstrategicosParams,
  ObjetivoEstrategicoEntityEnriquecido,
  UpdateObjetivoEstrategicoParams,
} from '../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import { ObjetivoEstrategicoMapper } from '../mappers/objetivo-estrategico.mapper';
import { RelacionOeEntity } from '../../domain/entities';
import { RelacionOeMapper } from '../mappers/relacion-oe.mapper';

@Injectable()
export class PrismaObjetivoEstrategicoRepository implements ObjetivoEstrategicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    params: CreateObjetivoEstrategicoParams,
    tipoModuloId: number,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido> {
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.planEstrategico.findUniqueOrThrow({
        where: { id: params.plan_estrategico_id },
      });

      // Decisión OFT0-268: count + 1 por plan y tipo; se acepta la ventana
      // de carrera porque solo se crean objetivos con el plan en Borrador.
      const totalExistentes = await tx.objetivoEstrategico.count({
        where: {
          plan_estrategico_id: params.plan_estrategico_id,
          tipo_modulo_id: tipoModuloId,
        },
      });
      const correlativo = String(totalExistentes + 1).padStart(3, '0');
      const codigo = `${plan.codigo}-OE-N-${correlativo}`;

      const created = await tx.objetivoEstrategico.create({
        data: {
          codigo,
          plan_estrategico_id: params.plan_estrategico_id,
          perspectiva_bsc_id: params.perspectiva_bsc_id,
          tipo_modulo_id: tipoModuloId,
          estado_objetivo_id: 1,
          responsable: params.responsable,
          nombre: params.nombre,
          descripcion: params.descripcion,
        },
        include: {
          perspectiva_bsc: true,
          estado_objetivo: true,
          relaciones_como_origen: true,
        },
      });

      for (const destinoId of params.relaciones_destino_ids) {
        await tx.relacionOe.create({
          data: { origen_id: created.id, destino_id: destinoId },
        });
      }

      const conRelaciones = await tx.objetivoEstrategico.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          perspectiva_bsc: true,
          estado_objetivo: true,
          relaciones_como_origen: true,
        },
      });

      return ObjetivoEstrategicoMapper.toDomain(conRelaciones);
    });
  }

  async findById(
    id: number,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido | null> {
    const objetivo = await this.prisma.objetivoEstrategico.findUnique({
      where: { id },
      include: {
        perspectiva_bsc: true,
        estado_objetivo: true,
        relaciones_como_origen: true,
      },
    });

    return objetivo ? ObjetivoEstrategicoMapper.toDomain(objetivo) : null;
  }

  private async buscar(
    params: ListObjetivosEstrategicosParams,
    soloActivos: boolean,
  ): Promise<PaginatedResult<ObjetivoEstrategicoEntityEnriquecido>> {
    const where: Prisma.ObjetivoEstrategicoWhereInput = {
      plan_estrategico_id: params.plan_estrategico_id,
      tipo_modulo: { codigo: 'NEG' },
      ...(soloActivos ? { estado: true } : {}),
      ...(params.perspectiva_bsc_id === undefined
        ? {}
        : { perspectiva_bsc_id: params.perspectiva_bsc_id }),
      ...(params.search
        ? { nombre: { contains: params.search, mode: 'insensitive' } }
        : {}),
    };

    const [objetivos, total] = await this.prisma.$transaction([
      this.prisma.objetivoEstrategico.findMany({
        where,
        include: {
          perspectiva_bsc: true,
          estado_objetivo: true,
          relaciones_como_origen: true,
        },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: [{ perspectiva_bsc: { orden: 'asc' } }, { nombre: 'asc' }],
      }),
      this.prisma.objetivoEstrategico.count({ where }),
    ]);

    return {
      data: objetivos.map((objetivo) =>
        ObjetivoEstrategicoMapper.toDomain(objetivo),
      ),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async findMany(
    params: ListObjetivosEstrategicosParams,
  ): Promise<PaginatedResult<ObjetivoEstrategicoEntityEnriquecido>> {
    return this.buscar(params, true);
  }

  async findManyIncluyendoInactivos(
    params: ListObjetivosEstrategicosParams,
  ): Promise<PaginatedResult<ObjetivoEstrategicoEntityEnriquecido>> {
    return this.buscar(params, false);
  }

  async findActivosPorPlan(
    planId: number,
    tipoModuloId: number,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido[]> {
    const objetivos = await this.prisma.objetivoEstrategico.findMany({
      where: {
        plan_estrategico_id: planId,
        tipo_modulo_id: tipoModuloId,
        estado: true,
      },
      include: {
        perspectiva_bsc: true,
        estado_objetivo: true,
        relaciones_como_origen: true,
      },
      orderBy: [{ perspectiva_bsc: { orden: 'asc' } }, { nombre: 'asc' }],
    });

    return objetivos.map((objetivo) =>
      ObjetivoEstrategicoMapper.toDomain(objetivo),
    );
  }

  async existsByName(
    planId: number,
    tipoModuloId: number,
    nombre: string,
    excludeId?: number,
  ): Promise<boolean> {
    const objetivo = await this.prisma.objetivoEstrategico.findFirst({
      where: {
        plan_estrategico_id: planId,
        tipo_modulo_id: tipoModuloId,
        nombre: { equals: nombre, mode: 'insensitive' },
        estado: true,
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });

    return objetivo !== null;
  }

  async update(
    id: number,
    params: UpdateObjetivoEstrategicoParams,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido> {
    return this.prisma.$transaction(async (tx) => {
      const { relaciones_destino_ids, ...data } = params;

      await tx.objetivoEstrategico.update({
        where: { id },
        data,
      });

      for (const destinoId of relaciones_destino_ids ?? []) {
        await tx.relacionOe.create({
          data: { origen_id: id, destino_id: destinoId },
        });
      }

      const objetivo = await tx.objetivoEstrategico.findUniqueOrThrow({
        where: { id },
        include: {
          perspectiva_bsc: true,
          estado_objetivo: true,
          relaciones_como_origen: true,
        },
      });

      return ObjetivoEstrategicoMapper.toDomain(objetivo);
    });
  }

  async setEstado(
    id: number,
    estado: boolean,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido> {
    const objetivo = await this.prisma.objetivoEstrategico.update({
      where: { id },
      data: { estado },
      include: {
        perspectiva_bsc: true,
        estado_objetivo: true,
        relaciones_como_origen: true,
      },
    });

    return ObjetivoEstrategicoMapper.toDomain(objetivo);
  }

  async tieneKpisORelacionesActivas(id: number): Promise<boolean> {
    // TODO(HU-A-028): sumar el conteo de KPIs cuando exista la tabla kpi.
    const relaciones = await this.prisma.relacionOe.count({
      where: {
        estado: true,
        OR: [{ origen_id: id }, { destino_id: id }],
      },
    });

    return relaciones > 0;
  }

  async findRelacionesActivasPorPlanYTipo(
    planId: number,
    tipoModuloId: number,
  ): Promise<{ origen_id: number; destino_id: number }[]> {
    return this.prisma.relacionOe.findMany({
      where: {
        estado: true,
        origen: {
          plan_estrategico_id: planId,
          tipo_modulo_id: tipoModuloId,
        },
      },
      select: { origen_id: true, destino_id: true },
    });
  }

  async existeRelacionInversa(
    origenId: number,
    destinoId: number,
  ): Promise<boolean> {
    const relacion = await this.prisma.relacionOe.findFirst({
      where: {
        origen_id: destinoId,
        destino_id: origenId,
        estado: true,
      },
      select: { id: true },
    });

    return relacion !== null;
  }

  async crearRelacion(origenId: number, destinoId: number): Promise<void> {
    await this.prisma.relacionOe.create({
      data: { origen_id: origenId, destino_id: destinoId },
    });
  }

  async findRelacionById(relacionId: number): Promise<RelacionOeEntity | null> {
    const relacion = await this.prisma.relacionOe.findUnique({
      where: { id: relacionId },
    });

    return relacion ? RelacionOeMapper.toDomain(relacion) : null;
  }

  async eliminarRelacion(relacionId: number): Promise<void> {
    await this.prisma.relacionOe.update({
      where: { id: relacionId },
      data: { estado: false },
    });
  }

  async updateEstadoObjetivo(
    id: number,
    nuevoEstadoObjetivoId: number,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido> {
    const objetivo = await this.prisma.objetivoEstrategico.update({
      where: { id },
      data: { estado_objetivo_id: nuevoEstadoObjetivoId },
      include: {
        perspectiva_bsc: true,
        estado_objetivo: true,
        relaciones_como_origen: true,
      },
    });

    return ObjetivoEstrategicoMapper.toDomain(objetivo);
  }
}
