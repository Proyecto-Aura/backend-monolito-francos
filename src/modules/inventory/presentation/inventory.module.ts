import { Module } from '@nestjs/common';
import { ProductionModule } from '../../production/presentation/production.module';
import { ProductoTerminadoPersistenceModule } from '../infrastructure/producto-terminado-persistence.module';
import { InsumoSalidaPersistenceModule } from '../infrastructure/insumo-salida-persistence.module';
import { CreateInsumoUseCase } from '../application/use-cases/insumo/create-insumo.use-case';
import { GetInsumoByIdUseCase } from '../application/use-cases/insumo/get-insumo-by-id.use-case';
import { ListInsumosUseCase } from '../application/use-cases/insumo/list-insumos.use-case';
import { UpdateInsumoUseCase } from '../application/use-cases/insumo/update-insumo.use-case';
import { ChangeInsumoStatusUseCase } from '../application/use-cases/insumo/change-insumo-status.use-case';
import { GetIndicadoresInsumoUseCase } from '../application/use-cases/insumo/get-indicadores-insumo.use-case';
import { CreateLoteInsumoUseCase } from '../application/use-cases/lote-insumo/create-lote-insumo.use-case';
import { GetLoteInsumoByIdUseCase } from '../application/use-cases/lote-insumo/get-lote-insumo-by-id.use-case';
import { ListLoteInsumosUseCase } from '../application/use-cases/lote-insumo/list-lote-insumos.use-case';
import { ChangeLoteInsumoStatusUseCase } from '../application/use-cases/lote-insumo/change-lote-insumo-status.use-case';
import { RegistrarEntradaInsumoUseCase } from '../application/use-cases/movimiento-insumo/registrar-entrada-insumo.use-case';
import { RegistrarAjusteInsumoUseCase } from '../application/use-cases/movimiento-insumo/registrar-ajuste-insumo.use-case';
import { GetMovimientoByIdUseCase } from '../application/use-cases/movimiento-insumo/get-movimiento-by-id.use-case';
import { ListMovimientosUseCase } from '../application/use-cases/movimiento-insumo/list-movimientos.use-case';
import { GetIndicadoresProductoTerminadoUseCase } from '../application/use-cases/producto-terminado/get-indicadores-producto-terminado.use-case';
import { UpdateProductoTerminadoUseCase } from '../application/use-cases/producto-terminado/update-producto-terminado.use-case';
import { RegistrarEntradaProductoTerminadoUseCase } from '../application/use-cases/movimiento-producto-terminado/registrar-entrada-producto-terminado.use-case';
import { RegistrarSalidaProductoTerminadoUseCase } from '../application/use-cases/movimiento-producto-terminado/registrar-salida-producto-terminado.use-case';
import { RegistrarAjusteProductoTerminadoUseCase } from '../application/use-cases/movimiento-producto-terminado/registrar-ajuste-producto-terminado.use-case';
import { GetMovimientoProductoTerminadoByIdUseCase } from '../application/use-cases/movimiento-producto-terminado/get-movimiento-producto-terminado-by-id.use-case';
import { ListMovimientosProductoTerminadoUseCase } from '../application/use-cases/movimiento-producto-terminado/list-movimientos-producto-terminado.use-case';
import { MovimientoProductoTerminadoRepository } from '../domain/repositories/movimiento-producto-terminado.repository';
import { PrismaMovimientoProductoTerminadoRepository } from '../infrastructure/repositories/prisma-movimiento-producto-terminado.repository';
import { InsumosController } from './controllers/insumos.controller';
import { LotesInsumoController } from './controllers/lotes-insumo.controller';
import { MovimientosInsumoController } from './controllers/movimientos-insumo.controller';
import { MovimientosProductoTerminadoController } from './controllers/movimientos-producto-terminado.controller';
import { ProductosTerminadosController } from './controllers/productos-terminados.controller';

// El filtro de errores de dominio (CatalogDomainExceptionFilter) sigue
// registrado como APP_FILTER en CatalogModule; al ser global, también
// captura las excepciones que lanzan los use-cases de este módulo.
@Module({
  imports: [
    ProductoTerminadoPersistenceModule,
    InsumoSalidaPersistenceModule,
    ProductionModule,
  ],
  controllers: [
    InsumosController,
    LotesInsumoController,
    MovimientosInsumoController,
    ProductosTerminadosController,
    MovimientosProductoTerminadoController,
  ],
  providers: [
    CreateInsumoUseCase,
    GetInsumoByIdUseCase,
    ListInsumosUseCase,
    UpdateInsumoUseCase,
    ChangeInsumoStatusUseCase,
    GetIndicadoresInsumoUseCase,
    CreateLoteInsumoUseCase,
    GetLoteInsumoByIdUseCase,
    ListLoteInsumosUseCase,
    ChangeLoteInsumoStatusUseCase,
    RegistrarEntradaInsumoUseCase,
    RegistrarAjusteInsumoUseCase,
    GetMovimientoByIdUseCase,
    ListMovimientosUseCase,
    UpdateProductoTerminadoUseCase,
    GetIndicadoresProductoTerminadoUseCase,
    RegistrarEntradaProductoTerminadoUseCase,
    RegistrarSalidaProductoTerminadoUseCase,
    RegistrarAjusteProductoTerminadoUseCase,
    GetMovimientoProductoTerminadoByIdUseCase,
    ListMovimientosProductoTerminadoUseCase,
    {
      provide: MovimientoProductoTerminadoRepository,
      useClass: PrismaMovimientoProductoTerminadoRepository,
    },
  ],
  // Sales reutiliza la salida FEFO; los contratos de lotes provienen de ProductionModule.
  exports: [RegistrarSalidaProductoTerminadoUseCase],
})
export class InventoryModule {}
