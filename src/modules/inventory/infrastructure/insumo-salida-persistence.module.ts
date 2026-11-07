import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma/prisma.module';
import { RegistrarSalidaInsumoUseCase } from '../application/use-cases/movimiento-insumo/registrar-salida-insumo.use-case';
import { InsumoRepository } from '../domain/repositories/insumo.repository';
import { LoteInsumoRepository } from '../domain/repositories/lote-insumo.repository';
import { MovimientoInsumoRepository } from '../domain/repositories/movimiento-insumo.repository';
import { PrismaInsumoRepository } from './repositories/prisma-insumo.repository';
import { PrismaLoteInsumoRepository } from './repositories/prisma-lote-insumo.repository';
import { PrismaMovimientoInsumoRepository } from './repositories/prisma-movimiento-insumo.repository';

// Adaptador compartido: inventario registra salidas manuales de insumo y
// producción dispara salidas automáticas al entregar una solicitud de
// insumos (OFT0-264). No importa módulos de negocio ni duplica el registro
// del proveedor, mismo criterio que ProductoTerminadoPersistenceModule.
@Module({
  imports: [PrismaModule],
  providers: [
    { provide: InsumoRepository, useClass: PrismaInsumoRepository },
    { provide: LoteInsumoRepository, useClass: PrismaLoteInsumoRepository },
    {
      provide: MovimientoInsumoRepository,
      useClass: PrismaMovimientoInsumoRepository,
    },
    RegistrarSalidaInsumoUseCase,
  ],
  exports: [
    InsumoRepository,
    LoteInsumoRepository,
    MovimientoInsumoRepository,
    RegistrarSalidaInsumoUseCase,
  ],
})
export class InsumoSalidaPersistenceModule {}
