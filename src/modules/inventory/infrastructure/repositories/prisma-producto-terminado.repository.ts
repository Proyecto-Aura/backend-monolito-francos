import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ProductoTerminadoEntity } from '../../domain/entities';
import { ProductoTerminadoRepository } from '../../domain/repositories/producto-terminado.repository';
import {
  IndicadoresProductoTerminado,
  UpdateProductoTerminadoParams,
} from '../../domain/repositories/types/producto-terminado-repository.types';
import { ProductoTerminadoMapper } from '../mappers/producto-terminado.mapper';

// % de stock_maximo a partir del cual un producto terminado se marca "alto"
// en los indicadores del dashboard. Mismo umbral que insumos.
const UMBRAL_ALTO_PORCENTAJE = 90;

// Embebido en la respuesta para que el front no tenga que resolver el
// catálogo aparte (mismo criterio que insumo_* en movimientos).
const INCLUDE_CATALOGO = {
  producto_presentacion: {
    select: {
      sku: true,
      estado: true,
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

  async findById(id: number): Promise<ProductoTerminadoEntity | null> {
    const productoTerminado = await this.prisma.productoTerminado.findUnique({
      where: { id },
      include: INCLUDE_CATALOGO,
    });

    return productoTerminado
      ? ProductoTerminadoMapper.toDomain(productoTerminado)
      : null;
  }

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

  async getIndicadores(): Promise<IndicadoresProductoTerminado> {
    const [fila] = await this.prisma.$queryRaw<
      {
        agotado: bigint;
        bajo: bigint;
        alto: bigint;
        normal: bigint;
        total: bigint;
      }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE pt.stock_actual <= 0) AS agotado,
        COUNT(*) FILTER (
          WHERE pt.stock_actual > 0 AND pt.stock_actual < pt.stock_minimo
        ) AS bajo,
        COUNT(*) FILTER (
          WHERE pt.stock_actual >= pt.stock_minimo
            AND pt.stock_maximo IS NOT NULL
            AND (pt.stock_actual / pt.stock_maximo) * 100 > ${UMBRAL_ALTO_PORCENTAJE}
        ) AS alto,
        COUNT(*) FILTER (
          WHERE pt.stock_actual >= pt.stock_minimo
            AND (
              pt.stock_maximo IS NULL
              OR (pt.stock_actual / pt.stock_maximo) * 100 <= ${UMBRAL_ALTO_PORCENTAJE}
            )
        ) AS normal,
        COUNT(*) AS total
      FROM commerce.producto_terminado pt
      JOIN commerce.producto_presentacion pp ON pp.id = pt.producto_presentacion_id
      WHERE pp.estado = true
    `;

    return {
      agotado: Number(fila.agotado),
      bajo: Number(fila.bajo),
      alto: Number(fila.alto),
      normal: Number(fila.normal),
      total: Number(fila.total),
    };
  }
}
