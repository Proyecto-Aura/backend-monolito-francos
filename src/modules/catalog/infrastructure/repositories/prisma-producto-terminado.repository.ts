import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ProductoTerminadoRepository } from '../../domain/repositories/producto-terminado.repository';

@Injectable()
export class PrismaProductoTerminadoRepository implements ProductoTerminadoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsConStockByProducto(productoId: number): Promise<boolean> {
    const productoTerminado = await this.prisma.productoTerminado.findFirst({
      where: {
        stock_actual: { gt: 0 },
        producto_presentacion: { producto_id: productoId },
      },
      select: { id: true },
    });

    return productoTerminado !== null;
  }

  async existsConStockByProductoPresentacion(
    productoPresentacionId: number,
  ): Promise<boolean> {
    const productoTerminado = await this.prisma.productoTerminado.findFirst({
      where: {
        stock_actual: { gt: 0 },
        producto_presentacion_id: productoPresentacionId,
      },
      select: { id: true },
    });

    return productoTerminado !== null;
  }
}
