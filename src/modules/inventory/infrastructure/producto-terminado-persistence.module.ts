import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma/prisma.module';
import { ProductoTerminadoRepository } from '../domain/repositories/producto-terminado.repository';
import { PrismaProductoTerminadoRepository } from './repositories/prisma-producto-terminado.repository';

// Adaptador compartido: producción consulta el producto e inventario gestiona
// sus saldos. No importa módulos de negocio ni duplica el registro del proveedor.
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: ProductoTerminadoRepository,
      useClass: PrismaProductoTerminadoRepository,
    },
  ],
  exports: [ProductoTerminadoRepository],
})
export class ProductoTerminadoPersistenceModule {}
