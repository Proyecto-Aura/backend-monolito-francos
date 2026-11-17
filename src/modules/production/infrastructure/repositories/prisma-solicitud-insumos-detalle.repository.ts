import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { SolicitudInsumosDetalleEntity } from '../../domain/entities';
import { SolicitudInsumosDetalleRepository } from '../../domain/repositories/solicitud-insumos-detalle.repository';
import { AgregarDetalleLineaInsumoParams } from '../../domain/repositories/types/solicitud-insumos-detalle-repository.types';
import { SolicitudInsumosDetalleMapper } from '../mappers/solicitud-insumos-detalle.mapper';

const INCLUDE_INSUMO = {
  insumo: {
    select: {
      sku: true,
      nombre: true,
      unidad_medida: true,
      stock_actual: true,
    },
  },
} satisfies Prisma.SolicitudInsumosDetalleInclude;

@Injectable()
export class PrismaSolicitudInsumosDetalleRepository implements SolicitudInsumosDetalleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<SolicitudInsumosDetalleEntity | null> {
    const detalle = await this.prisma.solicitudInsumosDetalle.findUnique({
      where: { id },
      include: INCLUDE_INSUMO,
    });
    return detalle ? SolicitudInsumosDetalleMapper.toDomain(detalle) : null;
  }

  async findBySolicitudId(
    solicitud_insumos_id: number,
  ): Promise<SolicitudInsumosDetalleEntity[]> {
    const lineas = await this.prisma.solicitudInsumosDetalle.findMany({
      where: { solicitud_insumos_id },
      orderBy: { id: 'asc' },
      include: INCLUDE_INSUMO,
    });
    return lineas.map((linea) => SolicitudInsumosDetalleMapper.toDomain(linea));
  }

  async existsByInsumoEnSolicitud(
    solicitud_insumos_id: number,
    insumo_id: number,
  ): Promise<boolean> {
    const existe = await this.prisma.solicitudInsumosDetalle.findUnique({
      where: {
        solicitud_insumos_id_insumo_id: {
          solicitud_insumos_id,
          insumo_id,
        },
      },
      select: { id: true },
    });
    return existe !== null;
  }

  async agregar(
    params: AgregarDetalleLineaInsumoParams,
  ): Promise<SolicitudInsumosDetalleEntity> {
    const creada = await this.prisma.solicitudInsumosDetalle.create({
      data: params,
      include: INCLUDE_INSUMO,
    });
    return SolicitudInsumosDetalleMapper.toDomain(creada);
  }

  async actualizarCantidad(
    id: number,
    cantidad_solicitada: number,
  ): Promise<SolicitudInsumosDetalleEntity> {
    const actualizada = await this.prisma.solicitudInsumosDetalle.update({
      where: { id },
      data: { cantidad_solicitada },
      include: INCLUDE_INSUMO,
    });
    return SolicitudInsumosDetalleMapper.toDomain(actualizada);
  }

  async eliminar(id: number): Promise<void> {
    await this.prisma.solicitudInsumosDetalle.delete({ where: { id } });
  }
}
