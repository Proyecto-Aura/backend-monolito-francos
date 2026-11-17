import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { SolicitudProduccionDetalleEntity } from '../../domain/entities';
import { SolicitudProduccionDetalleRepository } from '../../domain/repositories/solicitud-produccion-detalle.repository';
import { AgregarDetalleLineaParams } from '../../domain/repositories/types/solicitud-produccion-detalle-repository.types';
import { SolicitudProduccionDetalleMapper } from '../mappers/solicitud-produccion-detalle.mapper';

const INCLUDE_CATALOGO = {
  producto_terminado: {
    select: {
      producto_presentacion: {
        select: {
          sku: true,
          producto_id: true,
          presentacion_id: true,
          producto: {
            select: {
              nombre: true,
              categoria_id: true,
              categoria: { select: { nombre: true } },
            },
          },
          presentacion: { select: { cantidad: true, unidad_medida: true } },
        },
      },
    },
  },
} satisfies Prisma.SolicitudProduccionDetalleInclude;

@Injectable()
export class PrismaSolicitudProduccionDetalleRepository implements SolicitudProduccionDetalleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<SolicitudProduccionDetalleEntity | null> {
    const detalle = await this.prisma.solicitudProduccionDetalle.findUnique({
      where: { id },
      include: INCLUDE_CATALOGO,
    });
    return detalle ? SolicitudProduccionDetalleMapper.toDomain(detalle) : null;
  }

  async findBySolicitudId(
    solicitud_produccion_id: number,
  ): Promise<SolicitudProduccionDetalleEntity[]> {
    const lineas = await this.prisma.solicitudProduccionDetalle.findMany({
      where: { solicitud_produccion_id },
      orderBy: { id: 'asc' },
      include: INCLUDE_CATALOGO,
    });
    return lineas.map((linea) =>
      SolicitudProduccionDetalleMapper.toDomain(linea),
    );
  }

  async existsByProductoEnSolicitud(
    solicitud_produccion_id: number,
    producto_terminado_id: number,
  ): Promise<boolean> {
    const existe = await this.prisma.solicitudProduccionDetalle.findUnique({
      where: {
        solicitud_produccion_id_producto_terminado_id: {
          solicitud_produccion_id,
          producto_terminado_id,
        },
      },
      select: { id: true },
    });
    return existe !== null;
  }

  async agregar(
    params: AgregarDetalleLineaParams,
  ): Promise<SolicitudProduccionDetalleEntity> {
    const creada = await this.prisma.solicitudProduccionDetalle.create({
      data: params,
      include: INCLUDE_CATALOGO,
    });
    return SolicitudProduccionDetalleMapper.toDomain(creada);
  }

  async actualizarCantidad(
    id: number,
    cantidad_solicitada: number,
  ): Promise<SolicitudProduccionDetalleEntity> {
    const actualizada = await this.prisma.solicitudProduccionDetalle.update({
      where: { id },
      data: { cantidad_solicitada },
      include: INCLUDE_CATALOGO,
    });
    return SolicitudProduccionDetalleMapper.toDomain(actualizada);
  }

  async eliminar(id: number): Promise<void> {
    await this.prisma.solicitudProduccionDetalle.delete({ where: { id } });
  }
}
