import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ProductoTerminadoEntity } from '../../domain/entities';
import { ProductoTerminadoRepository } from '../../domain/repositories/producto-terminado.repository';
import { UpdateProductoTerminadoParams } from '../../domain/repositories/types/producto-terminado-repository.types';
import { ProductoTerminadoMapper } from '../mappers/producto-terminado.mapper';

// Embebido en la respuesta para que el front no tenga que resolver el
// catálogo aparte (mismo criterio que insumo_* en movimientos).
const INCLUDE_CATALOGO = {
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
} satisfies Prisma.ProductoTerminadoInclude;

@Injectable()
export class PrismaProductoTerminadoRepository implements ProductoTerminadoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProductoPresentacionId(
    productoPresentacionId: number,
  ): Promise<ProductoTerminadoEntity | null> {
    const productoTerminado = await this.prisma.productoTerminado.findUnique({
      where: { producto_presentacion_id: productoPresentacionId },
      include: INCLUDE_CATALOGO,
    });

    return productoTerminado
      ? ProductoTerminadoMapper.toDomain(productoTerminado)
      : null;
  }

  async updateByProductoPresentacionId(
    productoPresentacionId: number,
    params: UpdateProductoTerminadoParams,
  ): Promise<ProductoTerminadoEntity> {
    const productoTerminado = await this.prisma.productoTerminado.upsert({
      where: { producto_presentacion_id: productoPresentacionId },
      update: params,
      // Defaults iguales a los de la columna, por si la presentación es
      // vieja y nunca tuvo su fila de stock.
      create: {
        producto_presentacion_id: productoPresentacionId,
        stock_minimo: params.stock_minimo ?? 1,
        stock_maximo: params.stock_maximo ?? null,
      },
      include: INCLUDE_CATALOGO,
    });

    return ProductoTerminadoMapper.toDomain(productoTerminado);
  }

  async existeProductoPresentacion(
    productoPresentacionId: number,
  ): Promise<boolean> {
    const productoPresentacion =
      await this.prisma.productoPresentacion.findUnique({
        where: { id: productoPresentacionId },
        select: { id: true },
      });

    return productoPresentacion !== null;
  }
}
